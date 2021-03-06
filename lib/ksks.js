'use strict';

var cacheManager = require('cache-manager'),
  client = require('simple-keystone-client'),
  PiggybackBuffer = require('piggyback-buffer'),
  _ = require('underscore');

var DAYS_TO_SECONDS = 60 * 60 * 24;

var theClient;

function isExpired(catalog) {
  return (new Date(catalog.access.token.expires) < Date.now());
}

function ksks(options) {
  var options_ = options || {},
    buffer,
    cache;

  buffer = new PiggybackBuffer();
  cache = options_.cache || cacheManager.caching({ store: 'memory' });

  return {
    authenticate: function (props, cb) {
      var key = cacheKey(props.username);

      cache.get(key, function (err, res) {
        if (err) {
          return cb(err);
        } else if (res) {
          if (!isExpired(res)) {
            return cb(null, res);
          }
        }

        if (buffer.isPending(key)) {
          buffer.queue(key, cb);
        } else {
          buffer.queue(key, cb);
          client.authenticate(_.extend(
            _.pick(options_, 'identityEndpoint'),
            _.pick(props, 'username', 'password', 'apiKey', 'tenantId')),
            function (err, res) {
              if (err) {
                return buffer.reject(key, err);
              }
              cache.set(key, res, 1 * DAYS_TO_SECONDS, function (err) {
                if (err) {
                  buffer.reject(key, err);
                } else {
                  buffer.resolve(key, res);
                }
              });
            }
          );
        }
      });
    }
  };

  function cacheKey(username) {
    return 'ksks.user.' + username;
  }
}

ksks.authenticate = function (props, cb) {
  if (!theClient) {
    theClient = ksks();
  }
  theClient.authenticate(props, cb);
};

ksks.endpoint = function (catalog, props) {
  var service, endpoint;

  service = _.findWhere(catalog.access.serviceCatalog, { name: props.service }) ||
    { endpoints: [{ publicURL: undefined }] };

  if (props.region) {
    endpoint = _.findWhere(service.endpoints, { region: props.region }) ||
      { publicURL: undefined };
  } else {
    endpoint = service.endpoints[0];
  }

  return endpoint.publicURL;
};

ksks.token = function (catalog) {
  return catalog.access.token.id;
};

module.exports = ksks;
