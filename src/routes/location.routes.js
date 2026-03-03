const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  listCountries,
  createCountry,
  updateCountry,
  toggleCountryStatus,
  deleteCountry,
  listCities,
  createCity,
  updateCity,
  toggleCityStatus,
  deleteCity,
} = require('../controllers/location.controller');

// All location endpoints require auth (so merchants/companies can fetch dropdowns)
router.use(auth);

// Countries
router.get('/countries', listCountries);
router.post('/countries', authorize('superadmin'), createCountry);
router.put('/countries/:id', authorize('superadmin'), updateCountry);
router.patch('/countries/:id/toggle-status', authorize('superadmin'), toggleCountryStatus);
router.delete('/countries/:id', authorize('superadmin'), deleteCountry);

// Cities
router.get('/cities', listCities); // optional ?country_id=
router.post('/cities', authorize('superadmin'), createCity);
router.put('/cities/:id', authorize('superadmin'), updateCity);
router.patch('/cities/:id/toggle-status', authorize('superadmin'), toggleCityStatus);
router.delete('/cities/:id', authorize('superadmin'), deleteCity);

module.exports = router;
