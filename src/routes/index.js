const authRouter = require("./auth");
const todosRouter = require("./todos");

exports.Router = (server) => {
  server.use("/api/auth", authRouter);
  server.use("/api/todos", todosRouter);
};
