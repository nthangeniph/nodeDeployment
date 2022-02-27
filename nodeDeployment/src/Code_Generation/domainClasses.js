//creating a function for retrieving records from airtable and posting them to devops
async function propertiesTable() {

    //importing modules
    const mainTable = require("../Generate_DevOps_WorkItems/getMain");
    const allTables = require("../Generate_DevOps_WorkItems/getAll");
    const { airtableSetup } = require("../utility/configManager");
    let fs = require("fs");
    var Mustache = require("mustache");

    //retrieving data from airtable    
    async function primaryTable() {
        const propertiesFields = await mainTable("Properties", "Grid view");
        return propertiesFields;
    }
    async function foreignTables() {
        const entitiesFields = await allTables("Entities", "All: Entities and DTOs");
        const refListsFields = await allTables("RefLists", "Grid view");
        return entitiesFields;
    }

    let primary= await primaryTable();
    let foreign = await foreignTables();

    recordIdToName(primary, foreign)

    // 2. changing the data types of entity ref and reflist
    function getDataType(datatype, referenced, refListName) {
        if (primary.datatype === "Entity Reference") {
            return referenced;
        } else if (datatype === 'RefList') {
            return `RefList${refListName}?`
        }
        return datatype;
    }

    let result = []
    for (const { entity, description, name, reflist, referencedentity, datatype, classname } of primary) {

        if (!result[entity]) result[entity] = [];

        result[entity].push({
            entity, classname, description, name, reflist, referencedentity, datatype: getDataType(datatype, referencedentity, reflist),
        });
    }

    //creating a new folder
    const folderName = '../Code_Generation/DomainClasses_Code'

    try {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName)
        }
    } catch (err) {
        console.error(err)
    }

    //creating a template
    let propertyTamplate = `
        /// <summary> 
        /// {{description}}
        /// </summary> 

        public virtual {{datatype}} {{name}} {get;set}

        `;

    let classTemplate = `public class {{entity}} : {{classname}}
                {`;

    let genericClass = `public class {{entity}} : {{classname}}<Guid>
                {`;


    //looping through the object to write a file for each item in the object

    Object.entries(result).forEach((currentItem) => {
        let file = fs.createWriteStream(`../Code_Generation/DomainClasses_Code/${currentItem[0]}.cs`);

        var output = Mustache.render(currentItem[1][0].classname === 'FullAuditedEntity' ? genericClass : classTemplate, currentItem[1][0]);
        file.write(output);

        if (currentItem[1].length > 1) {
            currentItem[1].forEach((item) => {
                var output = Mustache.render(propertyTamplate, item);
                file.write(output);
            });
        } else if (currentItem[1].length) {
            var output = Mustache.render(propertyTamplate, currentItem[1][0]);
            file.write(output);
        }

        file.write(`
            }
             `);
    });

}

//calling the function
// propertiesTable();


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
    propertiesTable,
};




