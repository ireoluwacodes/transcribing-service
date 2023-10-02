const amqp = require("amqplib");
const dotenv = require("dotenv");
const fs = require("fs");
const express = require("express")
const mongoose = require("mongoose");
const https = require("https");
const { execSync: exec } = require("child_process");
const { Deepgram } = require("@deepgram/sdk");
const ffmpegStatic = require("ffmpeg-static");
const { Video } = require("./model");

dotenv.config();
const app = express()

const queue = "video";
let url = process.env.AMQPURL;
let apiKey = process.env.DEEPGRAM_API_KEY;

const deepgram = new Deepgram(apiKey);

async function ffmpeg(command) {
  return new Promise((resolve, reject) => {
    exec(`${ffmpegStatic} ${command}`, (err, stderr, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
}

async function transcribeLocalVideo(filePath) {
  ffmpeg(`-hide_banner -y -i ${filePath} ${filePath}.wav`);

  const audioFile = {
    buffer: fs.readFileSync(`${filePath}.wav`),
    mimetype: "audio/wav",
  };
  const response = await deepgram.transcription.preRecorded(audioFile, {
    punctuation: true,
  });
  return response.results;
}

 const listenMq = async () => {
  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    await mongoose.connect(process.env.MONGO_URI);

    process.once("SIGINT", async () => {
      await channel.close();
      await connection.close();
    });

    await channel.assertQueue(queue, { durable: false });
    await channel.consume(
      queue,
      (message) => {
        if (message) {
          console.log(" [x] Received '%s'");
          const details = JSON.parse(message.content.toString());

          const fileStream = fs.createWriteStream("transcribe.mp4");
          fileStream.write(details.video);

          transcribeLocalVideo("transcribe.mp4").then(async (transcript) => {
            await Video.findByIdAndUpdate(details.id, {
              transcript,
            });
            console.dir(transcript, { depth: null });
          });

          fs.unlinkSync("transcribe.mp4");
        }
      },
      { noAck: true }
    );

    console.log(" [*] Waiting for messages. To exit press CTRL+C");
  } catch (err) {
    console.warn(err);
  }
};
app.get('/',(req,res)=>{
 res.send("mq server home page")
})
PORT = process.env.PORT
listenMq();
const startApp = async () => {
  app.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`);
  });
};

startApp();
 
module.exports = app