import { Sequelize } from "sequelize";

// initiazlie mysql client and open connection pool
const sequelize = new Sequelize(
   process.env.DB_NAME,
   process.env.DB_USERNAME,
   process.env.DB_PW
    {
      host: process.env.DB_HOST,
      dialect: 'mysql'
   }
);

sequelize.authenticate().then(() => {
   console.log('Connected to mysql database');
}).catch((error) => {
   console.error('Unable to connect to the database: ', error);
});

export default sequelize;