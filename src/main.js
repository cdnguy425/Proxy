import { createProxy } from "simple-proxy-id"

createProxy({
  target: "https://jsonplaceholder.typicode.com",
  port: 3000,
  changeOrigin: true
})
