const Joi = require('joi');

const generateTokenSchema = Joi.object({
  channelName: Joi.string().required(),
  uid: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  role: Joi.string().valid('publisher', 'audience').default('publisher'),
  expireTime: Joi.number().min(60).max(86400).default(3600),
});

const startRecordingSchema = Joi.object({
  appointmentId: Joi.string().required(),
  mode: Joi.string().valid('individual', 'mix').default('mix'),
  storageConfig: Joi.object({
    vendor: Joi.number().valid(0, 1, 2, 3, 4, 5, 6, 7).optional(), // 0: Agora, 1: AWS S3, 2: Alibaba, 3: Tencent, 4: Kingsoft, 5: Microsoft Azure, 6: Google Cloud, 7: Huawei
    region: Joi.number().optional(),
    bucket: Joi.string().optional(),
    accessKey: Joi.string().optional(),
    secretKey: Joi.string().optional(),
    fileNamePrefix: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

const stopRecordingSchema = Joi.object({
  appointmentId: Joi.string().required(),
  mode: Joi.string().valid('individual', 'mix').default('mix'),
});

module.exports = {
  generateTokenSchema,
  startRecordingSchema,
  stopRecordingSchema,
};

