async function apiTable() {
    const fetch = require("node-fetch");
    const mainTable = require("./getMain");
    const allTables = require("./getAll");
    const { devopsSetup, airtableSetup } = require("../utility/configManager");
    let workItemDetails = [];
    let attachmentObject = [];
    let roles = '';
    let otherRes = '';
    let securityReqs = '';
    let checks = '';
    let logic = '';

    async function primaryTable() {
        const apiFields = await mainTable("APIs", "Requires DevOps Work Item");
        return apiFields;
    }
    async function foreignTables() {
        const detailedReqFields = await allTables("View Reqs", "All View Requirements");
        const otherReqsFields = await allTables("Other Reqs", "All Other Requirements");
        const releaseFields = await allTables("Releases", "All Releases");
        const menuFields = await allTables("Menu", "Menu Structure");
        const modulesFields = await allTables("Modules", "All Modules");
        const viewFields = await allTables("Views", "All Views");
        const entityFields = await allTables("Entities", "All: Entities and DTOs");
        const roleFields = await allTables("Roles", "All Roles - Incl. System");
        const backgroundJobsFields = await allTables("Background Jobs", "All Background Jobs");
        return detailedReqFields;
    }

    let primary= await primaryTable();
    let foreign = await foreignTables();

    recordIdToName(primary, foreign);


    ({ roles, otherRes, securityReqs, checks, logic } = createWorkItem(primary, roles, otherRes, securityReqs, checks, logic, fetch, devopsSetup, workItemDetails, attachmentObject));


    let patch = setTimeout(() => patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject), 5000);

    if (patch) {
        setTimeout(() => updateAirtable(primary, workItemDetails, airtableSetup), 2000);
    }
    // console.log(main)
}
module.exports = {
    apiTable
}

// apiTable()

function updateAirtable(primary, workItemDetails, airtableSetup) {
    console.log("updating airtable", new Date().getMilliseconds());
    primary.forEach((record) => {
        workItemDetails.forEach((workItem) => {
            if (record.name == workItem.title) {
                airtableSetup()("APIs").update(
                    [
                        {
                            id: record.APIsId,
                            fields: {
                                "Exist In DevOps": "Created Automatically",
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

function patchingLinks(primary, foreign, workItemDetails, fetch, devopsSetup, attachmentObject) {
    console.log("patching links and attachments", new Date().getMilliseconds());
    primary.forEach((record) => {
        foreign.forEach((view) => {
            for (i in view) {
                if (i === 'ViewsId') {
                    if (typeof view['required apis'] !== 'undefined') {
                        for (let x = 0; x < view['required apis'].length; x++) {
                            if (view['devops wi url'] !== undefined && view['required apis'][x] === record.APIsId) {
                                let successor = { name: record.name, url: view['devops wi url'] };
                                if (successor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (successor.name === workItem.title) {
                                            if (typeof(record.devOpsBoardUrl) != 'undefined') {
                                                    const fetchResult = async () => {
                                                        console.log('views', workItem.id, workItem.title, successor.url);
                                                        await fetch(
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
                                                    };
                                                    fetchWithAutoRetry(fetchResult, 10);
                                                }
                                            
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });
        foreign.forEach((viewReq) => {
            for (i in viewReq) {
                if (i === 'View ReqsId') {
                    if (typeof viewReq['uses apis'] !== 'undefined') {
                        for (let x = 0; x < viewReq['uses apis'].length; x++) {
                            if (viewReq['devops wi url'] !== undefined && viewReq['uses apis'][x] === record.name) {
                                let successor = { name: record.name, url: viewReq['devops wi url'] };
                                if (successor.url != '') {
                                    workItemDetails.forEach((workItem) => {
                                        if (successor.name === workItem.title) {
                                            if (typeof(record.devOpsBoardUrl) != 'undefined') {
                                                const fetchResult2 = async () => {
                                                    console.log('detailed reqs', workItem.id, workItem.title, successor.url);
                                                    await fetch(
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
                                                };
                                                fetchWithAutoRetry(fetchResult2, 10);
                                            }
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
                console.log(attachments.attachmentUrl.url);
                if (attachments.name === workItem.title) {
                    console.log(true);
                    if (typeof(record.devOpsBoardUrl) != 'undefined') {
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
                }
            });
        });
    });
}

function createWorkItem(primary, roles, otherRes, securityReqs, checks, logic, fetch, devopsSetup, workItemDetails, attachmentObject) {
    console.log("creating devops work item", new Date().getMilliseconds());
    primary.forEach((record) => {
        if (record['required roles'] !== undefined) {
            for (let i = 0; i < record['required roles'].length; i++) {
                roles += `${record['required roles'][i]},`;
            }
        } else {
            roles = 'None specified';
        }

        if (record['other standard restrictions'] !== undefined) {
            for (let i = 0; i < record['other standard restrictions'].length; i++) {
                otherRes += `${record['other standard restrictions'][i]},`;
            }
        } else {
            otherRes = 'None specified';
        }

        (record['security requirements'] == undefined) ? securityReqs = 'None specified' : securityReqs = `${record['security requirements']}`;

        (record['checks before execution'] == undefined) ? checks = 'None specified' : checks = `${record['checks before execution']}`;

        (record['business logic'] == undefined) ? logic = 'None specified' : logic = `${record['business logic']}`;

        // console.log(record.devOpsBoardUrl)
        if (typeof(record.devOpsBoardUrl) != 'undefined') {
            let airtableItem = `<a href='https://airtable.com/app8b4jMvvRiKVA3a/tbl5XawvXNmdelPax/viwfTLDf1Vh9W2apa/${record['APIsId']}'>https://airtable.com/app8b4jMvvRiKVA3a/tbl5XawvXNmdelPax/viwfTLDf1Vh9W2apa/${record['APIsId']}</a>`;
            fetch(`${record.devOpsBoardUrl}/_apis/wit/workitems/$Task?api-version=6.0`,
                {
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
                            value: `NEW API for '${record.name}' (${record['endpoint type']} : ${record.url})`,
                        },
                        {
                            op: "add",
                            path: "/fields/System.Tags",
                            value: `${record.release}`,
                        },
                        {
                            op: "add",
                            path: "/fields/System.Description",
                            value: `1. Description: ${record.description} <br/><br/>
                                    2. Module: ${record.viewModule} <br/><br/>
                                    3. Airtable item: ${airtableItem}`,
                        },
                        {
                            op: "add",
                            path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
                            value: ` i. Url should be: ${record.url}<br/>
                                     ii. Request format: ${record['request type']} : ${record.request} ${record['request dto']} <br/>
                                     iii. Response format: ${record['response type']} : ${record['response dto']} <br/>
                                     iv. "Security Requirements:" <br/>
                                          1. Roles required to access this end-point: ${roles} <br/>
                                          2. Standard restrictions: ${otherRes} <br/>
                                          3. Security requirements: ${securityReqs} <br/>
                                     v. "Business Logic:" <br/>
                                          1. "Checks to perform before execution: ${checks}<br/>
                                          2. Logic to apply: ${logic} <br/>`,
                        },
                        {
                            op: "add",
                            path: "/fields/Custom.OriginatingProject",
                            value: `${record.project}`
                        },
                        {
                            op: "add",
                            path: "/fields/Custom.Module",
                            value: `${record.viewModule}`
                        },
                        {
                            op: "add",
                            path: "/fields/Custom.SkillRequired",
                            value: `Shesha3`
                        }
                    ]),
                }).then(async (response) => {
                    // console.log(JSON.parse(await response.text()))
                    let id = JSON.parse(await response.text()).id;
                    let title = record.name;
                    workItemDetails.push({ id, title });
                });
        }
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
    return { roles, otherRes, securityReqs, checks, logic };
}

function fetchWithAutoRetry(fetcher, maxRetryCount) {
    return new Promise((resolve, reject) => {
        let retries = 0;
        const caller = () =>
            fetcher()
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    if (retries < maxRetryCount) {
                        retries++;
                        caller();
                    } else {
                        reject(error);
                    }
                });
        retries = 1;
        caller();
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
                        if (i == 'used by views') {
                            foreign.forEach((itemF) => {
                                if (itemF.hasOwnProperty('ViewsId')) {
                                    record['viewModule'] = query.module;
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