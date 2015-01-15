'use strict';

var cacheManager = require('cache-manager'),
  client = require('simple-keystone-client'),
  _ = require('underscore');

var DAYS_TO_SECONDS = 60 * 60 * 24;

var theClient;

function isExpired(catalog) {
  return (new Date(catalog.access.token.expires) < Date.now());
}

function ksks(options) {
  var options_ = options || {},
    cache;

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

        client.authenticate(_.extend(
          _.pick(options_, 'identityEndpoint'),
          _.pick(props, 'username', 'password', 'apiKey', 'tenantId')),
          function (err, res) {
            if (err) {
              return cb(err);
            }
            cache.set(key, res, 1 * DAYS_TO_SECONDS, function (err) {
              cb(err || null, res);
            });
          }
        );
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

module.exports = ksks;
