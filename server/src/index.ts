import app from "./app";
// Instantiate the image-processing queue (and its Redis connection) on boot.
import "./queues/imageProcessing";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Pholio API listening on http://localhost:${PORT}`);
});
