import { DataTypes } from "sequelize";
import sequelize from './client'

// Define the Credit model
const Credit = sequelize.define('Credit', {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expirationDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: new Date().toISOString(),
      },
    },
  });

// Define the Booking model
const Booking = sequelize.define('Booking', {
    time: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: new Date().toISOString(),
      },
    },
    patient: {
      type: DataTypes.STRING,
      allowNull: true, // Allow anonymous bookings
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending', // Default status
    },
  });
  
const BookingStatusUpdate = sequelize.define('BookingStatusUpdate', {
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
  
  // Define the relationship between Booking and Credit
  Booking.belongsTo(Credit);
  Credit.hasOne(Booking);
  
  // Define the relationship between Booking and BookingStatusUpdate
  Booking.hasMany(BookingStatusUpdate);
  BookingStatusUpdate.belongsTo(Booking);

  sequelize.sync({
    // un-comment the line below if the above tables already exist, and you want to re-create them
    // force: true
})
  .then(() => console.log('database synced'))
  .catch(err => console.error('error syncing database:', err))

  export { Credit, Booking, BookingStatusUpdate };