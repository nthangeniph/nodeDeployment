async function otherReqsTable() {
    const fetch = require("node-fetch");
    const mainTable = require("./getMain");
    const allTables = require("./getAll");
    const { devopsSetup, airtableSetup } = require("../utility/configManager");
    let workItemDetails = [];
    let attachmentObject = [];


    async function primaryTable() {
        const otherReqsFields = await mainTable("Other Reqs", "All Other Requirements");
        return otherReqsFields;
    }
    async function foreignTables() {
        const apiFields = await allTables("APIs", "All APIs");
        const releaseFields = await allTables("Releases", "All Releases");
        const menuFields = await allTables("Menu", "Menu Structure");
        const modulesFields = await allTables("Modules", "All Modules");
        const detailedReqFields = await allTables("View Reqs", "All View Requirements");
        const viewFields = await allTables("Views", "All Views");
        const entityFields = await allTables("Entities", "All: Entities and DTOs");
        const roleFields = await allTables("Roles", "All Roles - Incl. System");
        const backgroundJobsFields = await allTables("Background Jobs", "All Background Jobs");
        return apiFields;
    }

    let primary= await primaryTable();
    let foreign = await foreignTables();

    recordIdToName(primary, foreign);

    createWorkItem(primary, fetch, devopsSetup, workItemDetails, attachmentObject);

    let patch = setTimeout(() => patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject), 5000);

    if (patch) {
        setTimeout(() => updateAirtable(primary, workItemDetails, airtableSetup), 2000);
    }
}


module.exports = {
    otherReqsTable
}

function recordIdToName(primary, foreign) {
    primary.forEach((record) => {
        for (let i in record) {
            let t = record[i];
            if (t instanceof Array) {
                for (let x = 0; x < t.length; x++) {
                    let query = foreign.find((item) => Object.entries(item)[0][1] === t[x])
                    if (typeof (query) !== 'undefined') {
                        if (i == 'used by views') {
                            foreign.forEach((itemF) => {
                                if (itemF.hasOwnProperty('ViewsId')) {
                                    record['viewModule'] = foreign.find((item) =>
                                        Object.entries(item)[0][1] === t[x]).module;
                                    if (record.hasOwnProperty('viewModule')) {
                                        record['viewModule'] = query.module;
                                    }
                                }
                            })
                        }
                        foreign.forEach((itemF) => {
                            if (itemF.hasOwnProperty('ModulesId')) {
                                if (record.hasOwnProperty('viewModule')) {
                                    if (record['viewModule'].includes(itemF.ModulesId)) {
                                        if (Object.entries(itemF)[0][1] == record['viewModule']) {
                                            record['devOpsBoardUrl'] = foreign.find((item) => Object.entries(item)[0][1] == record['viewModule'])['devops board url'];
                                            record['viewModule'] = foreign.find((item) => Object.entries(item)[0][1] == record['viewModule']).name;
                                        }
                                    }
                                }
                            }
                        })
                        t[x] = query.name || query.num;
                    }
                }
            }
        }
    });
}

function createWorkItem(primary, fetch, devopsSetup, workItemDetails, attachmentObject) {
    console.log("creating devops work item", new Date().getMilliseconds());
    primary.forEach((record) => {
        if (record.devOpsBoardUrl !== undefined) {
            let airtableItem = `<a href='https://airtable.com/app8b4jMvvRiKVA3a/tbltZm0cY8qVJ0vFB/viwoKo9APQ2oE5x6N/${record['Other ReqsId']}'>https://airtable.com/app8b4jMvvRiKVA3a/tbltZm0cY8qVJ0vFB/viwoKo9APQ2oE5x6N/${record['Other ReqsId']}</a>`;
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
                        value: `NEW OTHER requirement for ${record.name}`,
                    },
                    {
                        op: "add",
                        path: "/fields/System.Tags",
                        value: `${record.release}`,
                    },
                    {
                        op: "add",
                        path: "/fields/System.Description",
                        value: `1. <b>Requirement</b>: ${record.requirement}<br/><br/>
                                2. <b>Module</b>: ${record.module} <br/><br/>
                                3. <b>Airtable item</b>: ${airtableItem}`,
                    },
                    {
                        op: "add",
                        path: "/fields/Custom.OriginatingProject",
                        value: `${record.project}`
                    },
                    {
                        op: "add",
                        path: "/fields/Custom.Module",
                        value: `${record.module}`
                    },
                    {
                        op: "add",
                        path: "/fields/Custom.SkillRequired",
                        value: `React`
                    }
                ]),
            }).then(async (response) => {
                let id = JSON.parse(await response.text()).id;
                let title = record.num;
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
                            let name = record.num;
                            let attachmentUrl = JSON.parse(await response.text());
                            attachmentObject.push({ name, attachmentUrl });
                        });
                    }
                }
            }
        }
    });
}

function patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject) {
    console.log("patching links and attachments", new Date().getMilliseconds());
    primary.forEach((record) => {
        foreign.forEach((view) => {
            for (i in view) {
                if (i === 'ViewsId') {
                    if (typeof view['uses other reqs'] !== 'undefined') {
                        for (let x = 0; x < view['uses other reqs'].length; x++) {
                            if (view['devops wi url'] !== undefined && view['uses other reqs'][x] === record['Other ReqsId']) {
                                let successor = { num: record.num, url: view['devops wi url'] };
                                if (successor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (successor.num === workItem.title) {
                                            console.log('view links', workItem.id, successor.url);
                                            fetch(
                                                `${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`,
                                                {
                                                    method: "PATCH",
                                                    headers: {
                                                        Authorization: devopsSetup(),
                                                        "Content-Type": "application/json-patch+json",
                                                    },
                                                    body: JSON.stringify(
                                                        [
                                                            {
                                                                op: "add",
                                                                path: "/relations/-",
                                                                value: {
                                                                    rel: "System.LinkTypes.Dependency-forward",
                                                                    url: successor.url,
                                                                    attributes: {
                                                                        comment: "Making a new link for the dependency"
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    ),
                                                }
                                            ).then(async (response) => {
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
                    if (typeof detailedReqs['uses other reqs'] !== 'undefined') {
                        for (let x = 0; x < detailedReqs['uses other reqs'].length; x++) {
                            if (detailedReqs['devops wi url'] !== '' && detailedReqs['uses other reqs'][x] === record['Other ReqsId']) {
                                let successor = { name: record.num, url: detailedReqs['devops wi url'] };
                                if (successor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (successor.name === workItem.title) {
                                            console.log('view reqs links', workItem.id, successor.url);
                                            fetch(
                                                `${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`,
                                                {
                                                    method: "PATCH",
                                                    headers: {
                                                        Authorization: devopsSetup(),
                                                        "Content-Type": "application/json-patch+json",
                                                    },
                                                    body: JSON.stringify(
                                                        [
                                                            {
                                                                op: "add",
                                                                path: "/relations/-",
                                                                value: {
                                                                    rel: "System.LinkTypes.Dependency-forward",
                                                                    url: successor.url,
                                                                    attributes: {
                                                                        comment: "Making a new link for the dependency"
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    ),
                                                }
                                            ).then(async (response) => {
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
        foreign.forEach((api) => {
            for (i in api) {
                if (i === 'APIsId') {
                    if (typeof api['uses other reqs'] !== 'undefined') {
                        for (let x = 0; x < api['uses other reqs'].length; x++) {
                            if (api['devops wi url'] !== undefined && api['uses other reqs'][x] === record['Other ReqsId']) {
                                let successor = { name: record.num, url: api['devops wi url'] };
                                if (successor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (successor.name === workItem.title) {
                                            console.log('other reqs links', workItem.title, successor.url);
                                            fetch(
                                                `${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`,
                                                {
                                                    method: "PATCH",
                                                    headers: {
                                                        Authorization: devopsSetup(),
                                                        "Content-Type": "application/json-patch+json",
                                                    },
                                                    body: JSON.stringify(
                                                        [
                                                            {
                                                                op: "add",
                                                                path: "/relations/-",
                                                                value: {
                                                                    rel: "System.LinkTypes.Dependency-reverse",
                                                                    url: successor.url,
                                                                    attributes: {
                                                                        comment: "Making a new link for the dependency"
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    ),
                                                }
                                            ).then(async (response) => {
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
        foreign.forEach((job) => {
            for (i in job) {
                if (i === 'Background JobsApi') {
                    if (typeof job['uses other reqs'] !== 'undefined') {
                        for (let x = 0; x < job['uses other reqs'].length; x++) {
                            if (job['devops wi url'] !== undefined && job['uses other reqs'][x] === record['Other ReqsId']) {
                                let successor = { name: record.num, url: job['devops wi url'] };
                                if (successor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (successor.name === workItem.title) {
                                            console.log('background jobs links', workItem.title, successor.url);
                                            fetch(
                                                `${record.devOpsBoardUrl}/_apis/wit/workitems/${workItem.id}?api-version=6.0`,
                                                {
                                                    method: "PATCH",
                                                    headers: {
                                                        Authorization: devopsSetup(),
                                                        "Content-Type": "application/json-patch+json",
                                                    },
                                                    body: JSON.stringify(
                                                        [
                                                            {
                                                                op: "add",
                                                                path: "/relations/-",
                                                                value: {
                                                                    rel: "System.LinkTypes.Dependency-reverse",
                                                                    url: successor.url,
                                                                    attributes: {
                                                                        comment: "Making a new link for the dependency"
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    ),
                                                }
                                            ).then(async (response) => {
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
        attachmentObject.forEach((attachments) => {
            workItemDetails.forEach((workItem) => {
                if (attachments.name === workItem.title) {
                    console.log(attachments.name, workItem.id);
                    if (!typeof (record.devOpsBoardUrl) == 'undefined') {
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
                        });
                    }
                }

            });
        });
    });
}

function updateAirtable(primary, workItemDetails, airtableSetup) {
    console.log("updating airtable", new Date().getMilliseconds());
    primary.forEach((record) => {
        workItemDetails.forEach((workItem) => {
            if (record.num == workItem.title) {
                airtableSetup()('Other Reqs').update(
                    [
                        {
                            id: record['Other ReqsId'],
                            fields: {
                                "Exists In DevOps": 'Created Automatically',
                                "DevOps WI Url": `${record.devOpsBoardUrl}/_workitems/edit/${workItem.id}`
                            },
                        },
                    ],
                    function (err, records) {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        records.forEach(function (record) {
                        });
                    }
                );
            }
        });
    });
}