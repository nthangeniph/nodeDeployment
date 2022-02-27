const express = require("express");
const router = express.Router();
const { nanoid } = require("nanoid");
//onst { rolesAPI } = require("../../Roles/rolesModule");
let fs = require("fs");
var Mustache = require("mustache");

const idLength = 8;

/**
 * @swagger
 * /Domains:
 *   get:
 *     summary: Returns the list of all the modified files
 *     tags: [Domains]
 *     responses:
 *       200:
 *         description: The list of the modified files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas'
 */

router.get("/", (req, res) => {
  const folderName = "../Properties/Dormain";
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }

  let propertyTamplate = `
                /// <summary> 
                /// {{description}}
                /// </summary> 

                public virtual {{dataType}} {{name}} {get;set}
             
                `;

  let file = fs.createWriteStream(`../Properties/Dormain/Example.cs`);

  var output = Mustache.render(propertyTamplate, {
    description: "This is description example",
    dataType: "string",
    name: "FirstName",
  });
  file.write(output);
  file.write(`
}
 `);

  res.send({ status: "fileWritten" });
});

/**
 * @swagger
 * /ReflList/{pathName}:
 *   post:
 *     summary: populate a given directory
 *     tags: [RefList]
 *     parameters:
 *       - in: path
 *         name: pathName
 *         schema:
 *           type: string
 *         required: true
 *         description: Reflist Directory
 *     responses:
 *       200:
 *         description: The list of the modified files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas'
 *       404:
 *         description: There were no changes made
 */

router.post("/:pathName", (req, res) => {
  try {
    const folderName = req.params.pathName;

    let propertyTamplate = `
                /// <summary> 
                /// {{description}}
                /// </summary> 

                public virtual {{dataType}} {{surName}} {get;set}
             
                `;

    let file = fs.createWriteStream(`${folderName}/RefExample.cs`);

    var output = Mustache.render(propertyTamplate, {
      description: "This is description example for reflists",
      dataType: "string",
      surName: "LastName",
    });
    file.write(output);
    file.write(`
}
 `);

    res.send([
      {
        filesAdded: ["patient.cs", "ICU.cs"],
        filesModified: ["discharged.cs", "critical.cs", "labour.cs"],
      },
    ]);
  } catch (error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
