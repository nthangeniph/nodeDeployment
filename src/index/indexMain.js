// const { viewsTable } = require("../src/Views_/views");
// const { viewReqsTable } = require("../src/View_Reqs/reqs");
// const { otherReqsTable } = require("../src/Other_Reqs/otherReqs");
// const { apiTable } = require("../src/APIs_/api");
// const { notificationTable } = require("../src/Notifications/notification");
// const { backgroundJobsTable } = require("../src/Background/background");

// calling functions
// async function functionsTimeOut() {
//   const viewReqsTime = setTimeout(viewsTable, 12000);
//   let otherReqsTime;
//   let apiTime;
//   let NotificationTime;
//   let BackgroundJobsTime;
//   if (viewReqsTime) {
//     otherReqsTime = setTimeout(viewReqsTable, 28000);
//   }
//   if (otherReqsTime) {
//     apiTime = setTimeout(otherReqsTable, 42000);
//   }
//   if (apiTime) {
//     NotificationTime = setTimeout(apiTable, 55000);
//   }
//   if (NotificationTime) {
//     BackgroundJobsTime = setTimeout(notificationTable, 70000);
//   }
//   if (BackgroundJobsTime) {
//     setTimeout(backgroundJobsTable, 82000);
//   }
// }

// functionsTimeOut();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const low = require("lowdb");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const booksRouter = require("../server/routes/books");

const PORT = process.env.PORT || 4000;

const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ books: [] }).write();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airtable Generator API",
      version: "1.0.0",
      description: "A simple Express Library API",
    },
    servers: [
      {
        url: "http://localhost:4000/",
      },
    ],
  },
  apis: ["../server/routes/*.js"],
};

const specs = swaggerJsDoc(options);

const app = express();

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

app.db = db;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/books", booksRouter);

app.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
