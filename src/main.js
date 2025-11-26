import { createProxy } from "simple-proxy-id"

createProxy({
  target: "https://p5js.org",
  port: 3000,
  changeOrigin: true
})
