async function viewsTable() {
    // importing modules
    const fetch = require("node-fetch");
    const mainTable = require("./getMain");
    const allTables = require("./getAll");
    const { devopsSetup, airtableSetup } = require("../utility/configManager");
    let workItemDetails = [];
    let attachmentObject = [];
    let cardAC = '';
    let menuAC = '';
    let rolesAC = '';

    // retrieving main table data
    async function primaryTable() {
        const viewFields = await mainTable("Views", "Requires DevOps Work Item");
        return viewFields;
    }

    // retrieving all foreign tables
    async function foreignTables() {
        const apiFields = await allTables("APIs", "All APIs");
        const releaseFields = await allTables("Releases", "All Releases");
        const menuFields = await allTables("Menu", "Menu Structure");
        const modulesFields = await allTables("Modules", "All Modules");
        const detailedReqFields = await allTables("View Reqs", "All View Requirements");
        const otherReqsFields = await allTables("Other Reqs", "All Other Requirements");
        const entityFields = await allTables("Entities", "All: Entities and DTOs");
        const roleFields = await allTables("Roles", "All Roles - Incl. System");
        return apiFields;
    }

    let primary= await primaryTable();
    let foreign = await foreignTables();

    // changing record id from foreign key to relevant name
    recordIdToName(primary, foreign);

    // creating devops work item
    createWorkItem(primary, fetch, devopsSetup, foreign, workItemDetails, attachmentObject, cardAC, menuAC, rolesAC);

    // patching links between associated work items
    let patch = setTimeout(() => { patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject) }, 5000);

    // updating the devops workitem link on airtable
    if (patch) {
        setTimeout(() => updateAirtable(primary, workItemDetails, airtableSetup), 2000);
    }
}


module.exports = {
    viewsTable,
};

// viewsTable();


function recordIdToName(primary, foreign) {
    primary.forEach((record) => {
        for (let i in record) {
            let t = record[i];
            // console.log(i, t)
            if (t instanceof Array) {
                for (let x = 0; x < t.length; x++) {
                    let query = foreign.find((item) => Object.entries(item)[0][1] === t[x]);
                    if (typeof (query) !== 'undefined') {
                        if (i == 'module') {
                            record['devOpsBoardUrl'] = query['devops board url'];
                        }
                        t[x] = query.name || query.num;
                    }
                }
            }
        }
    });
}

function createWorkItem(primary, fetch, devopsSetup, foreign, workItemDetails, attachmentObject, cardAC, menuAC, rolesAC) {
    console.log("creating devops work item", new Date().getMilliseconds());
    primary.forEach((record) => {
        foreign.forEach((reqNum) => {
            for (i in reqNum) {
                if (i === 'View ReqsId') {
                    if (record['detailed requirements'].includes(reqNum.num)) {
                        // console.log(true, record['detailed requirements']);
                        if (reqNum['separate devops card'] === true) {
                            cardAC = `1. ${reqNum.type} (${record.status}): ${reqNum.requirement}`;
                        }
                        if (record.menu != "N/A" && record.menu != null) {
                            menuAC = `User should be able to access the view from the primarymenu: ${record.menuPath}`;
                        }
                        if (record['required roles'].length != 0) {
                            rolesAC = `The view should only be accessible by users with the following role(s):`;
                            for (let i = 0; i < record['required roles'].length; i++) {
                                rolesAC += `${record['required roles'][i]} <br/>`;
                            }
                        }
                    }
                }
            }
        });
        let airtableItem = `<a href='https://airtable.com/app8b4jMvvRiKVA3a/tbl534ZzdSVA5rJ57/viwGlhm0twQKuMw6b/${record['ViewsId']}'>https://airtable.com/app8b4jMvvRiKVA3a/tbl534ZzdSVA5rJ57/viwGlhm0twQKuMw6b/${record['ViewsId']}</a>`;
        // let airtableLink=airtableItem.link(airtableItem);
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
                    value: `NEW VIEW: ${record.name} (${record['view type']})`,
                },
                {
                    op: "add",
                    path: "/fields/System.Tags",
                    value: `${record.release}`,
                },
                {
                    op: "add",
                    path: "/fields/System.Description",
                    value: `1. <b>Description</b>: ${record.description} <br/><br/>
                                  2. <b>Mockup</b>: ${record.mockup} <br/><br/>
                                  3. <b>Module</b>: ${record.module} <br/><br/>
                                  4. <b>Airtable item</b>: ${airtableItem},
                                  `

                },
                {
                    op: "add",
                    path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
                    value: ` ${cardAC} <br/>
                             ${menuAC} <br/>
                             ${rolesAC}`,
                },
                {
                    op: "add",
                    path: "/fields/Custom.OriginatingProject",
                    value: `${record.project}`,
                },
                {
                    op: "add",
                    path: "/fields/Custom.Module",
                    value: `${record.module}`,
                },
                {
                    op: "add",
                    path: "/fields/Custom.SkillRequired",
                    value: `React`,
                },
            ]),
        }).then(async (response) => {
            // console.log(JSON.parse(await response.text()))
            let id = JSON.parse(await response.text()).id;
            let title = record.name;
            workItemDetails.push({ id, title });
        });
        if (record.hasOwnProperty('attachments')) {
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

function patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject) {
    console.log("patching links and attachments", new Date().getMilliseconds());
    primary.forEach((record) => {
        foreign.forEach((api) => {
            for (i in api) {
                if (i === 'APIsId') {
                    //  console.log(api)
                    if (typeof api['used by views'] !== 'undefined') {
                        for (let x = 0; x < api['used by views'].length; x++) {
                            if (api['devops wi url'] !== undefined && api['used by views'][x] === record.ViewsId) {
                                let predecessor = { name: record.name, url: api['devops wi url'] };
                                if (predecessor.url != "") {
                                    workItemDetails.forEach((workItem) => {
                                        if (predecessor.name === workItem.title) {
                                            console.log('api links', workItem.title, predecessor.url);

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
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });

        foreign.forEach((otherReqs) => {
            for (i in otherReqs) {
                if (i === 'Other ReqsId') {
                    if (typeof otherReqs['used by views'] !== 'undefined') {
                        for (let x = 0; x < otherReqs['used by views'].length; x++) {
                            if (otherReqs['devops wi url'] !== undefined && otherReqs['used by views'][x] === record.ViewsId) {
                                let predecessor = { name: record.name, url: otherReqs['devops wi url'] };

                                if (predecessor.url != "") {
                                    workItemDetails.forEach((workItem) => {
                                        if (predecessor.name === workItem.title) {
                                            console.log('other reqs links', workItem.title, predecessor.url);

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
                }
            }
        });

        foreign.forEach((detailedReqs) => {
            for (i in detailedReqs) {
                if (i === 'View ReqsId') {
                    if (typeof detailedReqs['used by views'] !== 'undefined') {
                        for (let x = 0; x < detailedReqs[['used by views']].length; x++) {
                            if (detailedReqs['devops wi url'] !== "" && detailedReqs['used by views'][x] === record.ViewsId) {
                                let successor = { name: record.name, url: detailedReqs['devops wi url'] };

                                if (successor.url != "") {
                                    workItemDetails.forEach((workItem) => {
                                        if (successor.name === workItem.title) {
                                            console.log('detailed reqs links', workItem.title, successor.url);

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
                                            }).then(async (response) => { });
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });

        if (typeof(attachmentObject) !== "undefined") {
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
    }
    })
}

function updateAirtable(primary, workItemDetails, airtableSetup) {
    console.log("updating airtable", new Date().getMilliseconds());
    primary.forEach((record) => {
        workItemDetails.forEach((workItem) => {
            if (record.name == workItem.title) {
                airtableSetup()("Views").update(
                    [
                        {
                            id: record.ViewsId,
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
                        records.forEach(function (record) { });
                    }
                );
            }
        });
    });
}





