// devOps work item module imports
const {viewsTable} = require('../Generate_DevOps_WorkItems/views');
const {apiTable} = require('../Generate_DevOps_WorkItems/api');
const {viewReqsTable} = require('../Generate_DevOps_WorkItems/reqs');
const {otherReqsTable} = require('../Generate_DevOps_WorkItems/otherReqs');
const {notificationTable} = require('../Generate_DevOps_WorkItems/notifications');
const {backgroundJobsTable} = require('../Generate_DevOps_WorkItems/background');

// code generation module imports
const {propertiesTable} = require('../Code_Generation/domainClasses');
const {refListsItemsTable} = require('../Code_Generation/refListItems')


// work item generation function
async function generateWorkItems() {
    const views = await viewsTable();
    const api = await apiTable();
    const viewReqs = await viewReqsTable();
    const otherReqs = await otherReqsTable();
    const notifications = await notificationTable();
    const background = await backgroundJobsTable();
}

generateWorkItems();


// code generation function
async function codeGeneration() {
    const domainClasses = await propertiesTable();
    const refLists = await refListsItemsTable();
}

codeGeneration();

