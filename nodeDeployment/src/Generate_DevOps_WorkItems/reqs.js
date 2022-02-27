async function viewReqsTable() {
    const fetch = require("node-fetch");
    const mainTable = require("./getMain");
    const allTables = require("./getAll");
    const { devopsSetup, airtableSetup } = require("../utility/configManager");
    let workItemDetails = [];
    let attachmentObject = [];


    async function primaryTable() {
        const detailedReqFields = await mainTable("View Reqs", "Requires DevOps Work Item");
        return detailedReqFields;
    }
    async function foreignTables() {
        const apiFields = await allTables("APIs", "All APIs");
        const otherReqsFields = await allTables("Other Reqs", "All Other Requirements");
        const releaseFields = await allTables("Releases", "All Releases");
        const menuFields = await allTables("Menu", "Menu Structure");
        const modulesFields = await allTables("Modules", "All Modules");
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


    let patch = setTimeout(() => { patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject) }, 5000);

    if (patch) {
        setTimeout(() => updateAirtable(primary, workItemDetails, airtableSetup), 2000);
    }
    // console.log(primary)


}
// viewReqsTable()

module.exports = {
    viewReqsTable
}

function updateAirtable(primary, workItemDetails, airtableSetup) {
    console.log("updating airtable", new Date().getMilliseconds());
    primary.forEach((record) => {
        workItemDetails.forEach((workItem) => {
            if (record.num == workItem.title) {
                airtableSetup()('View Reqs').update(
                    [
                        {
                            id: record['View ReqsId'],
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

function patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject) {
    console.log("patching links and attachments", new Date().getMilliseconds());
    primary.forEach((record) => {
        foreign.forEach((api) => {
            for (i in api) {
                if (i === 'APIsId') {
                    if (typeof api['used by view reqs'] !== 'undefined') {
                        for (let x = 0; x < api['used by view reqs'].length; x++) {
                            if (api['devops wi url'] !== undefined && api['used by view reqs'][x] === record['View ReqsId']) {
                                let predecessor = { num: record.num, url: api['devops wi url'] };
                                if (predecessor.url != "") {
                                    workItemDetails.forEach((workItem) => {
                                        if (predecessor.num === workItem.title) {
                                            console.log('api links', workItem.id, predecessor.url);
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
        foreign.forEach((otherReq) => {
            for (i in otherReq) {
                if (i === 'Other ReqsId') {
                    if (typeof otherReq['used by view reqs'] !== 'undefined') {
                        for (let x = 0; x < otherReq['used by view reqs'].length; x++) {
                            if (otherReq['devops wi url'] !== undefined && otherReq['used by view reqs'][x] === record['View ReqsId']) {
                                let predecessor = { num: record.num, url: otherReq['devops wi url'] };
                                if (predecessor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (predecessor.num === workItem.title) {
                                            console.log('otherReqs links', workItem.id, predecessor.url);
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
                                                                    url: predecessor.url,
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
        foreign.forEach((notification) => {
            for (i in notification) {
                if (i === 'NotificationsId') {
                    if (typeof notification['used by view reqs'] !== 'undefined') {
                        for (let x = 0; x < notification['used by view reqs'].length; x++) {
                            if (notification['devops wi url'] !== undefined && notification['used by view reqs'][x] === record['View ReqsId']) {
                                let predecessor = { num: record.num, url: notification['devops wi url'] };
                                if (predecessor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (predecessor.num === workItem.title) {
                                            console.log('notification links', workItem.id, predecessor.url);
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
                                                                    url: predecessor.url,
                                                                    attributes: {
                                                                        comment: "Making a new link for the dependency"
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    ),
                                                }
                                            ).then(async (response) => {
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
        foreign.forEach((config) => {
            for (i in config) {
                if (i === 'ConfigId') {
                    if (typeof config['used by view reqs'] !== 'undefined') {
                        for (let x = 0; x < config['used by view reqs'].length; x++) {
                            if (config['devops wi url'] !== undefined && config['used by view reqs'][x] === record['View ReqsId']) {
                                let predecessor = { num: record.num, url: config['devops wi url'] };
                                if (predecessor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (predecessor.num === workItem.title) {
                                            console.log('config links', workItem.id, predecessor.url);
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
                                                                    url: predecessor.url,
                                                                    attributes: {
                                                                        comment: "Making a new link for the dependency"
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    ),
                                                }
                                            ).then(async (response) => {
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
        foreign.forEach((view) => {
            for (i in view) {
                if (i === 'ViewsId') {
                    if (typeof view['used by view reqs'] !== 'undefined') {
                        for (let x = 0; x < view['used by view reqs'].length; x++) {
                            if (view['devops wi url'] !== undefined && view['used by view reqs'][x] === record.num) {
                                let predecessor = { num: record.num, url: view['devops wi url'] };
                                if (predecessor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (predecessor.num === workItem.title) {
                                            console.log('views links', workItem.id, predecessor.url);
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
                                                                    url: predecessor.url,
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
                // console.log(attachments.attachmentUrl.url);
                if (attachments.name === workItem.title) {
                    console.log(attachments.name, workItem.id);
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

function createWorkItem(primary, fetch, devopsSetup, workItemDetails, attachmentObject) {
    console.log("creating devops work item", new Date().getMilliseconds());
    primary.forEach((record) => {
        // console.log(`${record.devOpsBoardUrl}/_apis/wit/workitems/$Task?api-version=6.0`)
        let airtableItem = `<a href='https://airtable.com/app8b4jMvvRiKVA3a/tblKa2BNStudraVO6/viwT3MowUHIeWoFDQ/${record['view ReqsId']}'>https://airtable.com/app8b4jMvvRiKVA3a/tblKa2BNStudraVO6/viwT3MowUHIeWoFDQ/${record['view ReqsId']}</a>`;
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
                    value: `New requirement for ${record['parent view']}`,
                },
                {
                    op: "add",
                    path: "/fields/System.Tags",
                    value: `${record.release}`,
                },
                {
                    op: "add",
                    path: "/fields/System.Description",
                    value: `1. <b>Requirement</b>: ${record.requirement} <br/><br/>
                                            2. <b>Module</b>: ${record.viewModule}
                                            3. <b>Airtable Item</b>: ${airtableItem}`,
                },
                {
                    op: "add",
                    path: "/fields/Custom.Module",
                    value: `${record.viewModule}`
                },
                {
                    op: "add",
                    path: "/fields/Custom.SkillRequired",
                    value: `React`
                },
                {
                    op: "add",
                    path: "/fields/Custom.OriginatingProject",
                    value: `${record.project}`,
                }
            ]),
        }).then(async (response) => {
            // console.log(JSON.parse(await response.text()))
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
    });
}

function recordIdToName(primary, foreign) {
    primary.forEach((record) => {
        for (let i in record) {
            let t = record[i];
            if (t instanceof Array) {
                for (let x = 0; x < t.length; x++) {
                    let query = foreign.find((item) => Object.entries(item)[0][1] === t[x])
                    if (typeof (query) !== 'undefined') {
                        if (i == 'parent view') {
                            foreign.forEach((itemF) => {
                                if (itemF.hasOwnProperty('ViewsId')) {
                                    record['viewModule'] = foreign.find((item) =>
                                        Object.entries(item)[0][1] === t[x]).module;
                                    if (record.hasOwnProperty('viewModule')) {
                                        record['viewModule'] =query.module;
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