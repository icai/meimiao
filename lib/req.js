const request = require('request');

exports.get = (option, callback) => {
  let back = {},
    options = {
      method: 'GET',
      url: option.url,
      timeout: 45000,
      proxy: option.proxy || null,
      headers: {
        Referer: option.referer || null,
        'user-agent': option.ua || null,
        deviceType: option.deviceType || null
      }
    };
  if (!options.proxy) {
    delete options.proxy;
  }
  if (!options.headers['user-Agent']) {
    delete options.headers['user-Agent'];
  }
  if (!options.headers.Referer) {
    delete options.headers.Referer;
  }
  if (!options.headers.deviceType) {
    delete options.headers.deviceType;
  }
  request.get(options, (err, res, body) => {
    if (err) {
      return callback(err);
    }
    back = {
      statusCode: res.statusCode,
      headers: JSON.stringify(res.headers),
      body
    };
    return callback(null, back);
  });
};
exports.post = (option, callback) => {
  let back = {},
    options = {
      method: 'POST',
      url: option.url,
      headers: {
        Referer: option.referer || null
      },
      form: option.data
    };
  if (!options.headers.Referer) {
    delete options.headers.Referer;
  }
  request.post(options, (err, res, body) => {
    if (err) {
      return callback(err);
    }
    back = {
      statusCode: res.statusCode,
      headers: JSON.stringify(res.headers),
      body
    };
    return callback(err, back);
  });
};