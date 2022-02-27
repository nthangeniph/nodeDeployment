//creating a function for retrieving records from airtable and posting them to devops
async function notificationTable(){

    //importing modules
    const fetch = require("node-fetch");
    const mainTable = require("./getMain");
    const allTables = require("./getAll");
    const { devopsSetup, airtableSetup } = require("../utility/configManager");
    //declaring a global variable for storing workitems responses
    let workItemDetails = [];
    //declaring global acceptance criteria and attachment variables for posting to devops
    let mechanismAC= '';
    let triggeringScheduleAC= '';
    let templateAC = '';
    let attachmentObject = [];
    
    //retrieving data from airtable
    async function primaryTable() {
        const notificationsFields = await mainTable("Notifications", "All Notification Templates");
        return notificationsFields;
    }
    
    async function foreignTables() {
        const releaseFields = await allTables("Releases", "All Releases");
        const modulesFields = await allTables("Modules", "All Modules");
        const configsFields = await allTables("Config", "Requires DevOps Work Item");
        const otherReqsFields = await allTables("Other Reqs", "All Other Requirements");
        const backgroundFields = await mainTable("Background Jobs", "All Background Jobs");
        return releaseFields;
    }

    let primary = await primaryTable();
    let foreign = await foreignTables();
    
    // calling the RecordIdToName function to change record ID to record name
    recordIdToName(primary, foreign);
   
    // calling the createWorkitem function to create/post workitems to devops and retrieve attachments urls as it posts
    createWorkItem(primary, fetch, devopsSetup, workItemDetails, attachmentObject, mechanismAC, triggeringScheduleAC, templateAC)
    
    //patching to devops 
    let patch = setTimeout(() => patchingLinks(primary, workItemDetails, fetch, devopsSetup, foreign, attachmentObject), 5000);
    
    //updating airtable
    if (patch) {
        setTimeout(() => updateAirtable(primary, workItemDetails, airtableSetup), 2000);
    }
}
    
    //0. calling the function
    // notificationTable();
    
    //1. changing record ID to record name
    function recordIdToName(primary, foreign){
        primary.forEach(record=>{
            for(let key in record){
                let eachRecord= record[key]
            
                if(eachRecord instanceof Array){
                    for (let x = 0; x < eachRecord.length; x++) {
                        if (typeof (foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x])) !== 'undefined') {
                            if (key === 'module') {
                                record['devOpsBoardUrl'] = foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x])['devops board url'];
                            }
    
                            eachRecord[x] = foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x]).name || foreign.find((item) => Object.entries(item)[0][1] === eachRecord[x]).num;
                             }
                    }
                }
            }
        });
    }
    
    //2. creating workitems and retrieving attachments urls 
    function createWorkItem(primary, fetch, devopsSetup, workItemDetails, attachmentObject, mechanismAC, triggeringScheduleAC, templateAC) {
        console.log("creating devops work item", new Date().getMilliseconds());
        primary.forEach((record) => {
            
            //devops logic
            if (record['mechanism']  !='' &&  record['mechanism'] != null   ) {
                mechanismAC= `1.<b>Mechanism:</b> ${record['mechanism']}`
                }else{
                    mechanismAC=''
                }

            if (record['triggering schedule']  !='' &&  record['triggering schedule'] != null   ) {
                triggeringScheduleAC =`2.<b>Triggered Schedule:</b> ${record['triggering schedule']}`
                }else{
                    triggeringScheduleAC=''
                }
    
            if (record['template']  !='' &&  record['template'] != null   ) {
                templateAC= `3.<b>Template Text: </b>None specified}`
                }else{
                    templateAC= ''
                }

                
        let airtableItem = `<a href='https://airtable.com/app8b4jMvvRiKVA3a/tblHoaVBKSR86XM8M/viwC9c4ZBAtB12OzY/${record.NotificationsId}'>https://airtable.com/app8b4jMvvRiKVA3a/tblHoaVBKSR86XM8M/viwC9c4ZBAtB12OzY/${record.NotificationsId}</a>`;
 
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
                                    value:  `NEW NOTIFICATION TEMPLATE: (${record.name})`,
                                   
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
                                    value: ` ${mechanismAC} <br/>
                                             ${triggeringScheduleAC} <br/>
                                             ${templateAC}<br/>
                                           `,
                                },
                                {
                                    op: "add",
                                    path: "/fields/Custom.SkillRequired",
                                    value: 'Shesha 3',
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
    
    //3. patching devops workitems to add attachments and predecessors/successors
    function patchingLinks(primary, workItemDetails, fetch, devopsSetup, foreign, attachmentObject) {
    console.log("patching links and attachments", new Date().getMilliseconds());
    primary.forEach((record) => {
        
     //background Table
     foreign.forEach((background) => {
        if (typeof background['uses notification templates'] !== 'undefined') {
            for (let x = 0; x < background['uses notification templates'].length; x++) {

                if (background['devops wi url'] !== undefined && background['uses notification templates'][x] === background['NotificationsId']) {
                    let successor = { name: record.name, url: background['devops wi url'] };

                    if (successor.url != "") {
                        workItemDetails.forEach((workItem) => {

                            if (successor.name === workItem.title) {
                                console.log('background links', workItem.title, successor.url);

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
                                }).then(async (response) => {
                                });
                            }
                        });
                    }
                }
            }
        }
    });

    //detailed nums Table
    foreign.forEach((num) => {
    if (typeof num['uses notifications'] !== 'undefined') {
        for (let x = 0; x < num['uses notifications'].length; x++) {

            if (num['devops wi url'] !== undefined && num['uses notifications'][x] === record['NotificationsId']) {
                let successor = { name: record.name, url: num['devops wi url'] };
                
                if (successor.url != '') {
                    workItemDetails.forEach((workItem) => {

                        if (successor.name === workItem.title) {
                            console.log('detailed num',workItem.title, successor.url);
                            
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
                                // console.log(await response.text())
                            });
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
})
    }
    
//4. updating airtable with amended records
    function updateAirtable(primary, workItemDetails, airtableSetup) {
        console.log("updating airtable", new Date().getMilliseconds());
        primary.forEach((record) => {

            workItemDetails.forEach((workItem) => {
                if (record.name == workItem.title) {
                    airtableSetup()("Notifications").update(
                        [
                            {
                                id: record['NotificationsId'],
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

//5. exporting the function
    module.exports = {
        notificationTable,
    };
