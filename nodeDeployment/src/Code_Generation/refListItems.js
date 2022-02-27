async function refListsItemsTable(){

    //importing modules
    const mainTable = require("../Generate_DevOps_WorkItems/getMain");
    const allTables = require("../Generate_DevOps_WorkItems/getAll");
    const {airtableSetup } = require("../utility/configManager");
    let fs = require("fs");
    var Mustache = require("mustache");
    
    //retrieving data from airtable    
    async function primaryTable() {
        const refListItemsFields = await mainTable("RefListItems", "Grid view");
        return refListItemsFields;
    }
    async function foreignTables() {
        const refListsFields= await allTables("RefLists", "Grid view");
        return refListsFields;
    }

    let primary = await primaryTable();
    let foreign = await foreignTables();

    recordIdToName(primary, foreign)

    //creating a template for the ref lists items
    const result = {};

    for (const {reflist, itemvalue, item, namespace} of primary) {
        if (!result[reflist]) result[reflist] = [];
        result[reflist].push({reflist, itemvalue, item, namespace});

        let classTemplate = `
            [ReferenceList("{{namespace}}", "{{reflist}}")]
                public enum RefList{{reflist}}: long
            {`;

        let listTemplate = `
                    /// <summary>
                    ///
                    /// </summary>
                    [Description("{{item}}")]
                    {{item}} = {{itemvalue}} 
                    `;
        const folderName = '../Code_Generation/RefLists_Code'

        try {
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName)
            }
        } catch (err) {
            console.error(err)
        }

        //looping through the result object to create the templates
        Object.entries(result).forEach((currentItem) => {
            let file = fs.createWriteStream(`../Code_Generation/RefLists_Code/${currentItem[0]}.cs`);
                var output = Mustache.render(classTemplate, currentItem[1][0]);
                file.write(output);
                if (currentItem[1].length > 1) {
                    currentItem[1].forEach((item) => {
                        var output = Mustache.render(listTemplate, item);
                        file.write(output);
                    });
                } else if (currentItem[1].length) {
                    var output = Mustache.render(listTemplate, currentItem[1][0]);
                    file.write(output);
                }
                file.write(`
                        }
                         `);
        })

    }
}

// refListsItemsTable()

//changing record ID to record name
function recordIdToName(primary, foreign) {
    primary.forEach((record) => {
        for (let i in record) {
            let t = record[i];
            // console.log(i, t)
            if (t instanceof Array) {
                for (let x = 0; x < t.length; x++) {
                    if (typeof (foreign.find((item) => Object.entries(item)[0][1] === t[x])) !== 'undefined') {
                        t[x] = foreign.find((item) => Object.entries(item)[0][1] === t[x]).name || foreign.find((item) => Object.entries(item)[0][1] === t[x]).num;
                    }
                }
            }
        }
    });
}

//Exporting the function
module.exports = {
    refListsItemsTable,
};

