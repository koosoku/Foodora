const { spawn } = require('child_process');
const async = require('async');
const mongoClient = require('mongodb').MongoClient;
const { env, url } = require('../../config');

const PYTHON_MODES = {
  PROCESS: 'PROCESS',
  RECOMMEND: 'RECOMMEND',
};

const connect = (next) => {
  mongoClient.connect(url, (err, client) => {
    next(err, client, client.db(env).collection('recipes'));
  });
};

const selectRecipeById = (client, collection, id, next) => {
  collection.findOne({ id }, (err, item) => {
    client.close(() => next(err, item));
  });
};

module.exports.selectRecipeById = (id, callback) => {
  async.waterfall([
    connect,
    (client, collection, next) => selectRecipeById(client, collection, parseInt(id, 10), next),
  ], callback);
};

const selectAllRecipes = (collection, callback) => {
  collection.find({}).toArray(callback);
};

module.exports.selectAllRecipes = (callback) => {
  async.auto({
    connect,
    selectAllRecipes: ['connect', (results, autoCallback) => {
      const collection = results.connect[1];
      selectAllRecipes(collection, autoCallback);
    }],
    closeClient: ['connect', 'selectAllRecipes', (results, autoCallback) => {
      const client = results.connect[0];
      client.close(autoCallback);
    }],
  }, (err, results) => callback(err, results.selectAllRecipes));
};

const selectRecipesByIds = (collection, ids, callback) => {
  collection.find({ id: { $in: ids } }).toArray(callback);
};

module.exports.selectRecipesByIds = (ids, callback) => {
  async.auto({
    connect,
    selectRecipesByIds: ['connect', (results, autoCallback) => {
      const collection = results.connect[1];
      selectRecipesByIds(collection, ids, autoCallback);
    }],
    closeClient: ['connect', 'selectRecipesByIds', (results, autoCallback) => {
      const client = results.connect[0];
      client.close(autoCallback);
    }],
  }, (err, results) => callback(err, results.selectRecipesByIds));
};

const filterRecipeIds = (client, collection, ids, next) => {
  collection.find(
    { id: { $in: ids } },
    { projection: { id: 1, _id: 0 } },
  ).toArray(
    (err, items) => client.close(() => next(err, items.map(item => item.id))),
  );
};

module.exports.filterRecipeIds = (ids, callback) => {
  async.waterfall([
    connect,
    (client, collection, next) => filterRecipeIds(client, collection, ids, next),
  ], callback);
};

const searchRecipesCollection = (client, collection, query, next) => {
  collection.find(query).toArray((err, items) => {
    client.close(() => next(err, items));
  });
};

module.exports.search = (query, callback) => {
  async.waterfall([
    connect,
    (client, collection, next) => searchRecipesCollection(client, collection, query, next),
  ], callback);
};

const getRandomRecipes = (client, collection, numberOfRecipes, callback) => {
  collection.aggregate([{ $sample: { size: numberOfRecipes } }])
    .toArray((err, items) => {
      callback(err, items);
    });
};

module.exports.getRandomRecipes = (numberOfRecipes, callback) => {
  async.waterfall([
    connect,
    (client, collection, next) => getRandomRecipes(client, collection, numberOfRecipes, next),
  ], callback);
};


const dropRecipeTable = (client, collection, next) => {
  collection.drop(() => client.close(next));
};

module.exports.clean = (callback) => {
  async.waterfall([
    connect,
    dropRecipeTable,
  ], callback);
};

const createSearchIndex = (collection, callback) => {
  collection.createIndex({
    '$**': 'text',
  }, callback);
};

const createUniqueIndex = (collection, callback) => {
  collection.createIndex(
    { id: 1 },
    { unique: true },
    callback,
  );
};

module.exports.setup = (data, callback) => {
  async.auto({
    connect: autoCallback => connect(autoCallback),
    createUniqueIndex: ['connect', (results, autoCallback) => {
      const collection = results.connect[1];
      createUniqueIndex(collection, autoCallback);
    }],
    insertData: ['connect', 'createUniqueIndex', (results, autoCallback) => {
      const collection = results.connect[1];
      collection.insertMany(data, () => autoCallback(null));
    }],
    createSearchIndex: ['connect', (results, autoCallback) => {
      const collection = results.connect[1];
      createSearchIndex(collection, autoCallback);
    }],
    closeClient: ['connect', 'insertData', 'createSearchIndex', (results, autoCallback) => {
      const client = results.connect[0];
      client.close(autoCallback);
    }],
  }, callback);
};

module.exports.recommendRecipes = (recipeIds, callback) => {
  if (recipeIds.length === 0) {
    callback(false, []);
  } else {
    const pythonProcess = spawn('python', [
      'recommender.py',
      PYTHON_MODES.RECOMMEND,
      recipeIds.toString(),
    ]);

    let dataString = '';
    let recommendRecipeError = null;

    pythonProcess.stdout.on('data', (data) => {
      dataString += data;
    });

    pythonProcess.stderr.on('data', (error) => {
      recommendRecipeError = error;
    });

    pythonProcess.stdout.on('end', () => {
      callback(
        recommendRecipeError,
        recommendRecipeError || JSON.parse(dataString),
      );
    });
  }
};
