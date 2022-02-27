const { airtableSetup, devopsSetup } = require("../utility/configManager");
const EventEmitter = require("events");
const eventEmitter = new EventEmitter();
const base = airtableSetup();

// declaring global variables

let detailedFields = [];

function mainTable(entityName, view) {
  return new Promise((resolve, reject) => {
    try {
      base(entityName)
        .select({
          view,
        })
        .firstPage(async function (err, records) {
          if (err) {
            console.error(err);
            return;
          }
          let result = await fieldPopulator(records, entityName);
          eventEmitter.on("finish", (result) => {
            detailedFields=[];
            resolve(result);

          });

          eventEmitter.emit("finish", result);
        });
    } catch (error) {
      reject(error);
    }
  });
}

async function fieldPopulator(records, entityName) {
  return new Promise((resolve, reject) => {
    try {
      records.forEach(function (record) {
        let ID = record.id;
        let idName = `${entityName}Id`;

        let fields = Object.keys(record["fields"]);
        let newObject = {};
        newObject[idName] = ID;

        fields.forEach((item) => {
          let prop = item.toLowerCase();
          newObject[prop] = typeof record.get(item) === "undefined" ? "" : record.get(item);
        });

        detailedFields.push(newObject);
      });
      resolve(detailedFields);
    } catch {
      reject("something went wrong");
    }
  });
}

module.exports = mainTable;

