//creating a function for retrieving records from airtable and posting them to devops
async function backgroundJobsTable() {
  //importing modules
  const fetch = require("node-fetch");
  const mainTable = require("./getMain");
  const allTables = require("./getAll");
  const { devopsSetup, airtableSetup } = require("../utility/configManager");
  //declaring global acceptance criteria and attachment variables for posting to devops
  let triggeringScheduleAC = "";
  let usesNotificationTemplatesAC = "";
  let usesConfigsAC = "";
  let logicRequirementsAC = "";
  let attachmentObject = [];
  let workItemDetails = [];

  //retrieving data from airtable
  async function primaryTable() {
    const backgroundFields = await mainTable("Background Jobs", "All Background Jobs");
    return backgroundFields;
  }

  async function foreignTables() {
    const releaseFields = await allTables("Releases", "All Releases");
    const modulesFields = await allTables("Modules", "All Modules");
    const notificationsFields = await allTables("Notifications", "All Notification Templates");
    const configsFields = await allTables("Config", "Requires DevOps Work Item");
    const otherReqsFields = await allTables("Other Reqs", "All Other Requirements");
    return releaseFields;
  }

  let primary = await primaryTable();
  let foreign = await foreignTables();

  // calling the RecordIdToName function to change record ID to record name
  recordIdToName(primary, foreign);

  // calling the createWorkitem function to create/post workitems to devops and retrieve attachments urls as it posts
  createWorkItem(
    primary,
    fetch,
    devopsSetup,
    workItemDetails,
    attachmentObject,
    triggeringScheduleAC,
    usesNotificationTemplatesAC,
    usesConfigsAC,
    logicRequirementsAC
  );

  //patching to devops
  let patch = setTimeout(
    () => patchingLinks(primary, workItemDetails, fetch, devopsSetup, foreign, attachmentObject),
    5000
  );

  //updating airtable
  if (patch) {
    setTimeout(() => updateAirtable(primary, workItemDetails, airtableSetup), 2000);
  }
}

//0. calling the function
// backgroundJobsTable();

//1. changing record ID to record name
function recordIdToName(primary, foreign) {
  primary.forEach((record) => {
    for (let key in record) {
      let eachRecord = record[key];

      if (eachRecord instanceof Array) {
        for (let x = 0; x < eachRecord.length; x++) {
          if (typeof foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x]) !== "undefined") {
            if (key === "module") {
              record["devOpsBoardUrl"] = foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x])[
                "devops board url"
              ];
            }

            eachRecord[x] =
              foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x]).name ||
              foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x]).num;
          }
        }
      }
    }
  });
}

//2. creating workitems and retrieving attachments urls
function createWorkItem(
  primary,
  fetch,
  devopsSetup,
  workItemDetails,
  attachmentObject,
  triggeringScheduleAC,
  usesNotificationTemplatesAC,
  usesConfigsAC,
  logicRequirementsAC
) {
  console.log("creating devops work item", new Date().getMilliseconds());
  primary.forEach((record) => {
    //devop logic
    if (record["triggering schedule"] != "" && record["triggering schedule"] != null) {
      triggeringScheduleAC = `1.<b>Triggered Schedule:</b> ${record["triggering schedule"]}`;
    } else {
      triggeringScheduleAC = "";
    }

    if (record["uses notification templates"] != "" && record["uses notification templates"] != null) {
      usesNotificationTemplatesAC = `2.<b>Notification Template to use:</b> ${record["uses notification templates"]}`;
    } else {
      usesNotificationTemplatesAC = "";
    }

    if (record["uses configs"] != "" && record["uses configs"] != null) {
      usesConfigsAC = `3.<b>Must use config settings:</b> ${record["uses configs"]}`;
    } else {
      usesConfigsAC = "";
    }

    if (record["logic / requirements"] != "" && record["logic / requirements"] != null) {
      logicRequirementsAC = `4.<b>Logic/Requirement:</b> ${record["logic / requirements"]}`;
    } else {
      logicRequirementsAC = "";
    }

    let airtableItem = `<a href='https://airtable.com/app8b4jMvvRiKVA3a/tblA92HsQrhOR2FT5/viwvU4QQH9ThM7Hkh/${record["Background JobsId"]}'>https://airtable.com/app8b4jMvvRiKVA3a/tblA92HsQrhOR2FT5/viwvU4QQH9ThM7Hkh/${record["Background JobsId"]}</a>`;

    //Posting to devops
    fetch(`${record.devOpsBoardUrl}/_apis/wit/workitems/$Task?api-version=6.0`, {
      method: "POST",
      headers: {
        Authorization: devopsSetup(),
        "Content-Type": "application/json-patch+json",
      },
      body: JSON.stringify([
        {
          op: "add",
          path: "/fields/System.WorkItemType",
          value: "User Story",
        },
        {
          op: "add",
          path: "/fields/System.Title",
          value: `NEW: ${record.type} BACKGROUND JOB: (${record.name})`,
        },
        {
          op: "add",
          path: "/fields/System.Tags",
          value: `${record.release}`,
        },
        {
          op: "add",
          path: "/fields/System.Description",
          value: `1. <b>Description:</b> ${record.description} <br/> <br/>   \n
                                  2. <b>Module:</b> ${record.module} <br/> <br/>  \n
                                   3. <b>Airtable item:</b> ${airtableItem}
                            `,
        },
        {
          op: "add",
          path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
          value: ` ${triggeringScheduleAC} <br/>
                             ${usesNotificationTemplatesAC} <br/>
                             ${usesConfigsAC}<br/>
                             ${logicRequirementsAC}`,
        },
        {
          op: "add",
          path: "/fields/Custom.SkillRequired",
          value: "Shesha 3",
        },
        {
          op: "add",
          path: "/fields/Custom.Module",
          value: `${record.module}`,
        },
        {
          op: "add",
          path: "/fields/Custom.OriginatingProject",
          value: `${record.project}`,
        },
      ]),
    }).then(async (response) => {
      // console.log(JSON.parse(await response.text()))
      let id = JSON.parse(await response.text()).id;
      let title = record.name;
      workItemDetails.push({ id, title });
    });

    //adding hasOwnProperty variable to save attachments urls
    if (record.hasOwnProperty("attachments")) {
      if (record.attachments !== undefined) {
        for (var i = 0; i < record.attachments.length; i++) {
          fetch(
            `https://dev.azure.com/boxfusion/_apis/wit/attachments?fileName=${record.attachments[i].filename}&api-version=6.0`,
            {
              method: "POST",
              headers: {
                Authorization: devopsSetup(),
                "Content-Type": "application/json-patch+json",
              },
            }
          ).then(async (response) => {
            let name = record.name;
            let attachmentUrl = JSON.parse(await response.text());
            attachmentObject.push({ name, attachmentUrl });
          });
        }
      }
    }
  });
}

//3. patching devops workitems to add attachments and predecessors/successors
function patchingLinks(primary, workItemDetails, fetch, devopsSetup, foreign, attachmentObject) {
  console.log("patching links and attachments", new Date().getMilliseconds());
  primary.forEach((record) => {
    //config Table
    foreign.forEach((config) => {
      if (typeof config["used by background job"] !== "undefined") {
        for (let x = 0; x < config["used by background job"].length; x++) {
          if (
            config["devops wi url"] !== undefined &&
            config["used by background job"][x] === record["Background JobsId"]
          ) {
            let predecessor = { name: record.name, url: config["devops wi url"] };

            if (predecessor.url != "") {
              workItemDetails.forEach((workItem) => {
                if (predecessor.name === workItem.title) {
                  console.log("config links", workItem.title, predecessor.url);

                  fetch(`${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`, {
                    method: "PATCH",
                    headers: {
                      Authorization: devopsSetup(),
                      "Content-Type": "application/json-patch+json",
                    },
                    body: JSON.stringify([
                      {
                        op: "add",
                        path: "/relations/-",
                        value: {
                          rel: "System.LinkTypes.Dependency-reverse",
                          url: predecessor.url,
                          attributes: {
                            comment: "Making a new link for the dependency",
                          },
                        },
                      },
                    ]),
                  }).then(async (response) => {});
                }
              });
            }
          }
        }
      }
    });

    //Other reqs table
    foreign.forEach((otherReqs) => {
      if (typeof otherReqs["used by views"] !== "undefined") {
        for (let x = 0; x < otherReqs["used by views"].length; x++) {
          if (
            otherReqs["devops wi url"] !== undefined &&
            otherReqs["used by views"][x] === record["Background JobsId"]
          ) {
            let predecessor = { name: record.name, url: otherReqs["devops wi url"] };

            if (predecessor.url != "") {
              workItemDetails.forEach((workItem) => {
                if (predecessor.name === workItem.title) {
                  console.log("other reqs links", workItem.title, predecessor.url);

                  fetch(`${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`, {
                    method: "PATCH",
                    headers: {
                      Authorization: devopsSetup(),
                      "Content-Type": "application/json-patch+json",
                    },
                    body: JSON.stringify([
                      {
                        op: "add",
                        path: "/relations/-",
                        value: {
                          rel: "System.LinkTypes.Dependency-reverse",
                          url: predecessor.url,
                          attributes: {
                            comment: "Making a new link for the dependency",
                          },
                        },
                      },
                    ]),
                  }).then(async (response) => {
                    // console.log(await response.text())
                  });
                }
              });
            }
          }
        }
      }
    });

    //Notification table
    foreign.forEach((notification) => {
      if (typeof notification["used by background jobs"] !== "undefined") {
        for (let x = 0; x < notification[["used by background jobs"]].length; x++) {
          if (
            notification["devops wi url"] !== "" &&
            notification["used by background jobs"][x] === record["Background JobsId"]
          ) {
            let successor = { name: record.name, url: notification["devops wi url"] };

            if (successor.url != "") {
              workItemDetails.forEach((workItem) => {
                if (successor.name === workItem.title) {
                  console.log("notification links", workItem.title, successor.url);

                  fetch(`${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`, {
                    method: "PATCH",
                    headers: {
                      Authorization: devopsSetup(),
                      "Content-Type": "application/json-patch+json",
                    },
                    body: JSON.stringify([
                      {
                        op: "add",
                        path: "/relations/-",
                        value: {
                          rel: "System.LinkTypes.Dependency-forward",
                          url: successor.url,
                          attributes: {
                            comment: "Making a new link for the dependency",
                          },
                        },
                      },
                    ]),
                  }).then(async (response) => {});
                }
              });
            }
          }
        }
      }
    });

    //Attachment
    attachmentObject.forEach((attachments) => {
      workItemDetails.forEach((workItem) => {
        console.log(attachments.attachmentUrl.url);
        if (attachments.name === workItem.title) {
          console.log(true);
          fetch(`${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`, {
            method: "PATCH",
            headers: {
              Authorization: devopsSetup(),
              "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify([
              {
                op: "add",
                path: "/relations/-",
                value: {
                  rel: "AttachedFile",
                  url: attachments.attachmentUrl.url,
                  attributes: {
                    comment: "Spec for the work",
                  },
                },
              },
            ]),
          }).then(async (response) => {
            // console.log(JSON.parse(await response.text()))
          });
        }
      });
    });
  });
}

//4. updating airtable with amended records
function updateAirtable(primary, workItemDetails, airtableSetup) {
  console.log("updating airtable", new Date().getMilliseconds());
  primary.forEach((record) => {
    workItemDetails.forEach((workItem) => {
      if (record.name == workItem.title) {
        airtableSetup()("Background Jobs").update(
          [
            {
              id: record["Background JobsId"],
              fields: {
                "Exists In DevOps": "Created Automatically",
                "DevOps WI Url": `${record.devOpsBoardUrl}/_workitems/edit/${workItem.id}`,
              },
            },
          ],
          function (err, records) {
            if (err) {
              console.error(err);
              return;
            }
            records.forEach(function (record) {});
          }
        );
      }
    });
  });
}

//5. exporting the function
module.exports = {
  backgroundJobsTable,
};

function idToName() {
  for (let i = 0; i < viewFields.length; i++) {
    let tables = Object.keys(viewFields[i]);
    console.log("tables", viewFields[i]);
    tables.forEach((colmn) => {
      // if (typeof viewFields[i][colmn] !== "undefined") {
      //   for (let x = 0; x < viewFields[i][colmn].length; x++) {
      //     if (typeof viewFields[i][colmn] == "object") {
      //       viewFields[i][colmn][x] = releaseFields.find((item) => item.ReleasesId === viewFields[i][colmn][x]);
      //       if (releaseFields.find((item) => item.ReleasesId === viewFields[i][colmn][x])) {
      //         let releaseName = releaseFields.find((item) => item.ReleasesId === viewFields[i][colmn][x]).release[0]
      //           .name;
      //         console.log("realses", viewFields[i].release);
      //         if (!!releaseName && viewFields[i][colmn]["release"]) {
      //           console.log("realses", viewFields[i][colmn]["release"]);
      //           viewFields[i][colmn]["release"] = releaseName;
      //           // console.log("to pulate --1", viewFields[i][colmn]);
      //         } else {
      //           // viewFields[i][colmn][x] = releaseFields.find(
      //           //   (item) => item.ReleasesId === viewFields[i][colmn][x]
      //           // ).release[0].num;
      //         }
      //       }
      //     }
      //   }
      // }
    });
  }
}
