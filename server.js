'use strict';

const mysql = require('mysql2');
const inquirer = require('inquirer');
require('console.table');
const express = require('express');
const db = require('./db/connection');

const PORT = process.env.PORT || 3001;
const app = express();

// Express middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const promptMessages = {
    viewAllEmployees: "View All Employees",
    viewAllRoles: "View All Roles",
    viewAllDepartments: "View All Departments",
    viewByDepartment: "View All Employees By Department",
    viewByManager: "View All Employees By Manager",
    addDepartment: "Add a Department",
    addRole: "Add a Role",
    addEmployee: "Add an Employee",
    remove: "Remove a Department, Role, or Employee",
    update: "Update Employee Role or Manager",
    exit: "Exit"
};

db.connect(err => {
    if (err) throw err;
    prompt();
});

function prompt() {
    inquirer
        .prompt({
            name: 'action',
            type: 'list',
            message: 'What would you like to do?',
            choices: [
                promptMessages.viewAllEmployees,
                promptMessages.viewAllDepartments,
                promptMessages.viewAllRoles,
                promptMessages.viewByDepartment,
                promptMessages.viewByManager,
                promptMessages.addDepartment,
                promptMessages.addRole,
                promptMessages.addEmployee,
                promptMessages.remove,
                promptMessages.update,           
                promptMessages.exit
            ]
        })
        .then(answer => {
            console.log('answer', answer);
            switch (answer.action) {
                case promptMessages.viewAllEmployees:
                    viewAllEmployees();
                    break;

                case promptMessages.viewAllDepartments:
                    viewAllDepartments();
                    break;

                case promptMessages.viewAllRoles:
                    viewAllRoles();
                    break;

                case promptMessages.viewByDepartment:
                    viewByDepartment();
                    break;

                case promptMessages.viewByManager:
                    viewByManager();
                    break;

                case promptMessages.addDepartment:
                    addDepartment();
                    break;

                case promptMessages.addRole:
                    addRole();
                    break;

                case promptMessages.addEmployee:
                    addEmployee();
                    break;

                case promptMessages.remove:
                    remove();
                    break;

                case promptMessages.update:
                    update();
                    break;

                case promptMessages.exit:
                    db.end();
                    break;
            }
        });
}

function viewAllEmployees() {
    const query = `SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, ' ', manager.last_name) AS manager
    FROM employee
    LEFT JOIN employee manager on manager.id = employee.manager_id
    INNER JOIN role ON (role.id = employee.role_id)
    INNER JOIN department ON (department.id = role.department_id)
    ORDER BY employee.id;`;
    db.query(query, (err, res) => {
        if (err) throw err;
        console.log('\n');
        console.log('View All Employees');
        console.log('\n');
        console.table(res);
        prompt();
    });
}

function viewAllDepartments() {
    const query = `SELECT department.id, department.name
    FROM department
    ORDER BY department.id;`;
    db.query(query, (err, res) => {
        if (err) throw err;
        console.log('\n');
        console.log('View all Departments');
        console.log('\n');
        console.table(res);
        prompt();
    });
}

function viewAllRoles() {
    const query = `SELECT role.id, role.title, role.salary, department.name AS department
    FROM role
    INNER JOIN department ON (department.id = role.department_id)
    ORDER BY role.id;`;
    db.query(query, (err, res) => {
        if (err) throw err;
        console.log('\n');
        console.log('View all Roles');
        console.log('\n');
        console.table(res);
        prompt();
    });
}

function viewByDepartment() {
    const query = `SELECT department.name AS department, role.title, employee.id, employee.first_name, employee.last_name
    FROM employee
    LEFT JOIN role ON (role.id = employee.role_id)
    LEFT JOIN department ON (department.id = role.department_id)
    ORDER BY department.name;`;
    db.query(query, (err, res) => {
        if (err) throw err;
        console.log('\n');
        console.log('View Employees by Department');
        console.log('\n');
        console.table(res);
        prompt();
    });
}


function viewByManager() {
    const query = `SELECT CONCAT(manager.first_name, ' ', manager.last_name) AS manager, department.name AS department, employee.id, employee.first_name, employee.last_name, role.title
    FROM employee
    LEFT JOIN employee manager on manager.id = employee.manager_id
    INNER JOIN role ON (role.id = employee.role_id && employee.manager_id != 'NULL')
    INNER JOIN department ON (department.id = role.department_id)
    ORDER BY manager;`;
    db.query(query, (err, res) => {
        if (err) throw err;
        console.log('\n');
        console.log('View Employees by Manager');
        console.log('\n');
        console.table(res);
        prompt();
    });
}


async function addDepartment() {
    const addDept = await inquirer.prompt(askDepartment());
        db.query('SELECT * FROM department', async (err, res) => {
            console.log('New Department has been added!');
            db.query(
                'INSERT INTO department SET ?',
                {
                    name: addDept.dept_name
                },
                (err, res) => {
                    if (err) throw err;
                    viewAllDepartments();
                    prompt();

                }
            );
        });
    }

async function addRole() {
    const addTitle = await inquirer.prompt(askRole());
    db.query('SELECT * FROM department', async (err, res) => {
        if (err) throw err;
        let choices = res.map(res => `${res.name}`);
        choices.push('None');
        let { dept } = await inquirer.prompt([
            {
                name: 'dept',
                type: 'list',
                choices: choices,
                message: 'Which Department does the new Role fall under?: '
            }
            ])
            let deptID;
            for (const row of res) {
                if (row.name === dept) {
                    deptID = row.id;
                    continue;
                }
            }
    db.query('SELECT * FROM role', async (err, res) => {
            console.log('New Role has been added!');
                db.query(
                    'INSERT INTO role SET ?',
                    {
                        title: addTitle.title,
                        salary: addTitle.salary,
                        department_id: deptID
                    },
                    (err, res) => {
                        if (err) throw err;
                        viewAllRoles();
                        prompt();
                    }
                    );
                });
    })}


async function addEmployee() {
    const addname = await inquirer.prompt(askName());
    db.query('SELECT role.id, role.title FROM role ORDER BY role.id;', async (err, res) => {
        if (err) throw err;
        const { role } = await inquirer.prompt([
            {
                name: 'role',
                type: 'list',
                choices: () => res.map(res => res.title),
                message: 'What is the role of the new employee?: '
            }
        ]);
        let roleId;
        for (const row of res) {
            if (row.title === role) {
                roleId = row.id;
                continue;
            }
        }
        db.query('SELECT * FROM employee', async (err, res) => {
            if (err) throw err;
            let choices = res.map(res => `${res.first_name} ${res.last_name}`);
            choices.push('none');
            let { manager } = await inquirer.prompt([
                {
                    name: 'manager',
                    type: 'list',
                    choices: choices,
                    message: 'Choose the employee Manager: '
                }
            ]);
            let managerId;
            let managerName;
            if (manager === 'none') {
                managerId = null;
            } else {
                for (const data of res) {
                    data.fullName = `${data.first_name} ${data.last_name}`;
                    if (data.fullName === manager) {
                        managerId = data.id;
                        managerName = data.fullName;
                        console.log(managerId);
                        console.log(managerName);
                        continue;
                    }
                }
            }
            console.log('New Employee has been added!');
            db.query(
                'INSERT INTO employee SET ?',
                {
                    first_name: addname.first,
                    last_name: addname.last,
                    role_id: roleId,
                    manager_id: managerId
                },
                (err, res) => {
                    if (err) throw err;
                    viewAllEmployees();
                    prompt();

                }
            );
        });
    });

}

function remove() {
    const promptQ = {
        dept: "Department",
        role: "Role",
        employee: "Employee"
    };
    inquirer.prompt([
        {
            name: "action",
            type: "list",
            message: "Would you like to remove a Department, Role, or Employee?",
            choices: [promptQ.dept, promptQ.role, promptQ.employee]
        }
    ]).then(answer => {
        if (answer.action === "Department") removeDepartment();
        else if (answer.action === "Role") removeRole();
        else if (answer.action === "Employee") removeEmployee();
    });
};

async function removeEmployee() {
    db.query('SELECT * FROM employee', async (err, res) => {
        if (err) throw err;
        let choices = res.map(res => `${res.first_name} ${res.last_name}`);
        choices.push('None');
        let { employee } = await inquirer.prompt([
            {
                name: 'employee',
                type: 'list',
                choices: choices,
                message: 'Which employee would you like to remove?: '
            }
        ]);
        let employeeId;
        let employeeName;
        if (employee === 'None') {
            prompt();
        } else {
            for (const data of res) {
                data.fullName = `${data.first_name} ${data.last_name}`;
                if (data.fullName === employee) {
                    employeeId = data.id;
                    employeeName = data.fullName;
                    console.log(employeeId);
                    console.log(employeeName);
                    continue;
                }
            }
        }
    db.query('DELETE FROM employee WHERE ?',
        {
           id: employeeId
        },
        function (err) {
            if (err) throw err;
        }
    );
    console.log('Employee has been removed!');
    prompt();
})};

async function removeDepartment() {
    db.query('SELECT * FROM department', async (err, res) => {
        if (err) throw err;
        let choices = res.map(res => `${res.name}`);
        choices.push('None');
        let { dept } = await inquirer.prompt([
            {
                name: 'dept',
                type: 'list',
                choices: choices,
                message: 'Which Department would you like to remove?: '
            }])
    db.query('DELETE FROM department WHERE ?',
        {
            name: dept
        },
        function (err) {
            if (err) throw err;
        });  
    console.log('Department has been removed!');
    prompt();

})};

async function removeRole() {
    db.query('SELECT * FROM role', async (err, res) => {
        if (err) throw err;
        let choices = res.map(res => `${res.title}`);
        choices.push('None');
        let { role } = await inquirer.prompt([
            {
                name: 'role',
                type: 'list',
                choices: choices,
                message: 'Which Role would you like to remove?: '
            }])

    db.query('DELETE FROM role WHERE ?',
        {
            title: role
        },
        function (err) {
            if (err) throw err;
        }
    )
    console.log('Role has been removed!');
    prompt();

})};

function askId() {
    return ([
        {
            name: "name",
            type: "input",
            message: "What is the employee ID?:  "
        }
    ]);
}

function update() {
    const promptQ = {
        role: "Role",
        manager: "Manager"
    };
    inquirer.prompt([
        {
            name: "action",
            type: "list",
            message: "Would you like to update a Role or Manager?",
            choices: [promptQ.role, promptQ.manager]
        }
    ]).then(answer => {
        if (answer.action === "Manager") updateManager();
        else if (answer.action === "Role") updateRole();
    });
};


async function updateRole() {
    db.query('SELECT * FROM employee', async (err, res) => {
        if (err) throw err;
        let choices = res.map(res => `${res.first_name} ${res.last_name}`);
        choices.push('None');
        let { employee } = await inquirer.prompt([
            {
                name: 'employee',
                type: 'list',
                choices: choices,
                message: "Which employee's Role would you like to update?: "
            }
        ]);
        let employeeId;
        let employeeName;
        if (employee === 'None') {
            prompt();
        } else {
            for (const data of res) {
                data.fullName = `${data.first_name} ${data.last_name}`;
                if (data.fullName === employee) {
                    employeeId = data.id;
                    employeeName = data.fullName;
                    console.log(employeeId);
                    console.log(employeeName);
                    continue;
                }
            }
        };

    db.query('SELECT role.id, role.title FROM role ORDER BY role.id;', async (err, res) => {
        if (err) throw err;
        const { role } = await inquirer.prompt([
            {
                name: 'role',
                type: 'list',
                choices: () => res.map(res => res.title),
                message: 'What is their new Role?: '
            }
        ]);
        let roleId;
        for (const row of res) {
            if (row.title === role) {
                roleId = row.id;
                continue;
            }
        }
        db.query(`UPDATE employee 
        SET role_id = ${roleId}
        WHERE employee.id = ${employeeId}`, async (err, res) => {
            if (err) throw err;
            console.log('Role has been updated!')
            prompt();
        });
    });
})}

async function updateManager() {
    db.query('SELECT * FROM employee', async (err, res) => {
        if (err) throw err;
        let choices = res.map(res => `${res.first_name} ${res.last_name}`);
        choices.push('None');
        let { employee } = await inquirer.prompt([
            {
                name: 'employee',
                type: 'list',
                choices: choices,
                message: "Which employee's Manager would you like to update?: "
            }
        ]);
        let employeeId;
        let employeeName;
        if (employee === 'None') {
            prompt();
        } else {
            for (const data of res) {
                data.fullName = `${data.first_name} ${data.last_name}`;
                if (data.fullName === employee) {
                    employeeId = data.id;
                    employeeName = data.fullName;
                    console.log(employeeId);
                    console.log(employeeName);
                    continue;
                }
            }
        };

    db.query('SELECT * FROM employee', async (err, res) => {
        if (err) throw err;
        let choices = res.map(res => `${res.first_name} ${res.last_name}`);
        choices.push('none');
        let { manager } = await inquirer.prompt([
            {
                name: 'manager',
                type: 'list',
                choices: choices,
                message: 'Choose the employee Manager: '
            }
        ]);
        let managerId;
        let managerName;
        if (manager === 'none') {
            managerId = null;
        } else {
            for (const data of res) {
                data.fullName = `${data.first_name} ${data.last_name}`;
                if (data.fullName === manager) {
                    managerId = data.id;
                    managerName = data.fullName;
                    console.log(managerId);
                    console.log(managerName);
                    continue;
                }}
        };
        db.query(`UPDATE employee 
        SET manager_id = ${managerId}
        WHERE employee.id = ${employeeId}`, async (err, res) => {
            if (err) throw err;
            console.log('Manager has been updated!')
            prompt();
        });
    })})};

function askDepartment() {
    return ([
        {
            name: "dept_name",
            type: "input",
            message: "Enter the new Department Name: "
        }
    ]);
}

function askRole() {
    return ([
        {
            name: "title",
            type: "input",
            message: "Enter the name of the new Role: "
        },
        {
            name: "salary",
            type: "input",
            message: "Enter the salary for the new Role: "
        }
    ]);
}


function askName() {
    return ([
        {
            name: "first",
            type: "input",
            message: "Enter the first name: "
        },
        {
            name: "last",
            type: "input",
            message: "Enter the last name: "
        }
    ]);
}


// Default response for any other request (Not Found)
app.use((req, res) => {
    res.status(404).end();
  });
  
  // Start server after DB connection
  db.connect(err => {
    if (err) throw err;
    console.log('Database connected.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
  