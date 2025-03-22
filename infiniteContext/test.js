import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const genAI = new GoogleGenerativeAI('AIzaSyCxG0hAyoSCwMaLRarsWH2jrdFZs65QcF4');

// Converts local file information to base64
function fileToGenerativePart(path, mimeType) {
  console.log("base64Image:", Buffer.from(fs.readFileSync(path)).toString("base64"));
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = "Write an advertising jingle showing how the product in the first image could solve the problems shown in the second two images.";

  const imageParts = [
    fileToGenerativePart("jetpack.png", "image/jpeg"),
      fileToGenerativePart("problems.png", "image/jpeg"),
  ];
  console.log(imageParts);
  const generatedContent = await model.generateContent([prompt, ...imageParts]);

  console.log(generatedContent.response.text());
}

run();