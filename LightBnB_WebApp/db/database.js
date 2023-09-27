const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

/// Users

const pool = new Pool({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb'
});

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`
      SELECT * 
      FROM users 
      WHERE email = $1;
    `, [email])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.error('Error executing query', err.stack);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`
      SELECT * 
      FROM users 
      WHERE id = $1;
    `, [id])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.error('Error executing query', err.stack);
    });
};


const addUser = function (user) {
  return pool
    .query(`
      INSERT INTO users (name, email, password) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `, [user.name, user.email, user.password])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.error('Error executing query', err.stack);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(`
      SELECT reservations.*, properties.*, 
      users.name AS guest_fullname
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN users ON reservations.guest_id = users.id
      WHERE reservations.guest_id = $1
      LIMIT $2;
    `, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.error('Error executing query', err.stack);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
// const getAllProperties = (options, limit = 10) => {
//   return pool
//     .query(`SELECT * FROM properties LIMIT $1`, [limit])
//     .then((result) => {
//       // console.log(result.rows);
//       return result.rows;
//     })
//     .catch((err) => {
//       console.log(err.message);
//     });
// };
const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  WHERE properties.active = TRUE
  `;

  // 3
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `AND owner_id = $${queryParams.length} `;
  }

  // 4
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100.0); // Convert to cents
    queryParams.push(options.maximum_price_per_night * 100.0); // Convert to cents
    queryString += `AND cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
  } else if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100.0); // Convert to cents
    queryString += `AND cost_per_night >= $${queryParams.length} `;
  } else if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100.0); // Convert to cents
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  // 5
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `AND avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  // 6
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 7
  console.log(queryString, queryParams);

  // 8
  return pool.query(queryString, queryParams).then((res) => res.rows);
};



/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function (property) {
  return pool.query(
      `
      INSERT INTO properties (
        owner_id,
        title,
        description,
        thumbnail_photo_url,
        cover_photo_url,
        cost_per_night,
        street,
        city,
        province,
        post_code,
        country,
        parking_spaces,
        number_of_bathrooms,
        number_of_bedrooms
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
      `,
      [
        property.owner_id,
        property.title,
        property.description,
        property.thumbnail_photo_url,
        property.cover_photo_url,
        property.cost_per_night,
        property.street,
        property.city,
        property.province,
        property.post_code,
        property.country,
        property.parking_spaces,
        property.number_of_bathrooms,
        property.number_of_bedrooms,
      ]
    )
    .then((savedProperty) => {
      return savedProperty;
    })
    .catch((error) => {
      throw new Error(`Error adding property: ${error.message}`);
    });
};


module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
