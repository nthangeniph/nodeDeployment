const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const booksRouter = require("./routes/books");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airtable Generator API Project",
      version: "1.0.0",
      description: "A simple Express Library API",
    },
    servers: [
      {
        url: "http://localhost:8080/",
      },
    ],
  },
  apis: ["../../index.js"],
};

const swaggerSpec = swaggerJSDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/books", booksRouter);
app.listen(8080, () => {
  console.log("server is up....");
});
