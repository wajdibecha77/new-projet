const Service = require("../models/service");

const addService = (req, res) => {
  const { name, email, tel } = req.body;

  if (!name || !email || !tel) {
    res.status(400).json({
      message: "name , email and tel is required!",
    });
  }

  try {
    const newService = new Service({
      name: name,
      email: email,
      tel: tel,
    });
    newService.save().then(() => {
      res.status(200).json({
        message: "Service added!",
      });
    }); // yestanna serivce lin yetsajel
  } catch (err) {
    res.status(500).json({
      message: "name , email and tel is required!",
    });
  }
};

const deleteService = async (req, res) => {
  if (req.params.id) {
    let id = req.params.id;
    try {
      await Service.findByIdAndDelete({ _id: id });
      res.status(200).json({
        message: "Service deleted successfully",
      });
    } catch (err) {
      res.status(500).json({
        message: "Error collection!",
      });
    }
  } else {
    res.status(400).json({
      message: "ID is required!",
    });
  }
};

const getAllServices = (req, res) => {
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

const getServiceById = (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({
      message: "ID is required!",
      data: null,
    });
  }

  Service.findById({ _id: req.params.id }, (err, service) => {
    if (err || !service) {
      res.status(404).json({
        message: "service not found",
        data: null,
      });
    } else {
      res.status(200).json({
        message: "service found",
        data: service,
      });
    }
  });
};

const updateService = (req, res) => {
  const payload = {};

  if (req.body.name !== undefined && String(req.body.name).trim() !== "") {
    payload.name = req.body.name;
  }
  if (req.body.email !== undefined && String(req.body.email).trim() !== "") {
    payload.email = req.body.email;
  }
  if (req.body.tel !== undefined && String(req.body.tel).trim() !== "") {
    payload.tel = req.body.tel;
  }

  if (Object.keys(payload).length === 0) {
    return res.status(200).json({
      message: "no field changed",
      data: null,
    });
  }

  Service.findByIdAndUpdate(
    { _id: req.params.id },
    payload,
    { new: true },
    (err, service) => {
      if (err) {
        res.status(400).json({
          message: err.message || "service not updated",
          data: null,
        });
      } else if (!service) {
        res.status(404).json({
          message: "service not found",
          data: null,
        });
      } else {
        res.status(200).json({
          message: "service updated successfully",
          data: service,
        });
      }
    }
  );
};

module.exports = {
  addService,
  getAllServices,
  deleteService,
  getServiceById,
  updateService,
};
