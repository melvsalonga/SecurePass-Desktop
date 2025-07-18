const fs = require('node:fs');
const path = require('node:path');
const users = [];

class SimpleDatabaseManager {
  constructor() {
    this.dbPath = this.getDatabasePath();
    this.loadDatabase();
  }

  getDatabasePath() {
    const userDataPath = path.join(__dirname, 'data'); // using a local directory for simplicity
    return path.join(userDataPath, 'simpleDB.json');
  }

  loadDatabase() {
    if (fs.existsSync(this.dbPath)) {
      const rawData = fs.readFileSync(this.dbPath);
      const data = JSON.parse(rawData);
      users.length = 0; // clear the existing array
      users.push(...data.users || []);
    }
  }

  saveDatabase() {
    const data = { users };
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
  }
  
  createUser(username, password) {
    const user = { id: users.length + 1, username, password };
    users.push(user);
    this.saveDatabase();
    return user;
  }

  findUser(username) {
    return users.find(u => u.username === username);
  }

  authenticate(username, password) {
    const user = this.findUser(username);
    return user && user.password === password;
  }
}

module.exports = SimpleDatabaseManager;
