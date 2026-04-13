const Litige = require("../models/Litige");
const Service = require("../models/service");

const addLitige = (req, res) => {
  const { decription, interventionId } = req.body;

  if (!decription || !interventionId) {
    res.status(400).json({
      message: "Description is required!",
    });
  }

  try {
    const newLitige = new Litige({
      description: decription,
      interventionId: interventionId,
    });
    newLitige.save().then(() => {
      res.status(200).json({
        message: "Litige added!",
      });
    }); // yestanna serivce lin yetsajel
  } catch (err) {
    res.status(500).json({
      message: "ALl champs is required!",
    });
  }
};

const getAllLitigeByIntervention = (req, res) => {
  Service.find({}, (err, services) => {
    if (services.length <= 0) {
      res.status(500).json({
        message: "no services in system ",
        data: null,
      });
    } else {
      res.status(200).json({
        message: "services in system ",
        data: services,
      });
    }
  });
};

module.exports = { addLitige, getAllLitigeByIntervention };
