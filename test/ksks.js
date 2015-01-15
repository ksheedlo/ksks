'use strict';

var cacheManager = require('cache-manager'),
  expect = require('chai').expect,
  ksks = require('../lib/ksks'),
  nock = require('nock'),
  MOCK = require('./mocks');

function currentServiceCatalog() {
  return {
    access: {
      token: {
        expires: Date.now() + (1000 * 60 * 60) // 1 hour
      }
    }
  };
}

function expiredServiceCatalog() {
  return {
    access: {
      token: {
        expires: Date.now() - (1000 * 60 * 60) // 1 hour
      }
    }
  };
}

describe('ksks.authenticate', function () {
  it('gets the service catalog from the identity endpoint', function (done) {
    var scope = nock('https://identity.api.rackspacecloud.com')
      .post('/v2.0/tokens', {
        auth: {
          'RAX-KSKEY:apiKeyCredentials': {
            username: 'test.user',
            apiKey: 'deadbeefdeadbeefdeadbeefdeadbeef'
          }
        }
      })
      .reply(200, currentServiceCatalog());

    ksks.authenticate({
      username: 'test.user',
      apiKey: 'deadbeefdeadbeefdeadbeefdeadbeef'
    }, function (err, catalog) {
      if (err) {
        return done(err);
      }
      scope.done();
      expect(catalog).to.exist();
      done();
    });
  });

  it('uses the configured identity endpoint', function (done) {
    var scope, client;

    client = ksks({
      identityEndpoint: 'http://localhost:8900/identity/v2.0/tokens'
    });
    scope = nock('http://localhost:8900')
      .post('/identity/v2.0/tokens')
      .reply(200, currentServiceCatalog());

    client.authenticate({
      username: 'test.user',
      apiKey: 'deadbeefdeadbeefdeadbeefdeadbeef'
    }, function (err, catalog) {
      if (err) {
        return done(err);
      }
      scope.done();
      expect(catalog).to.exist();
      done();
    });
  });

  it('sends the tenant id if present', function (done) {
    var scope;

    scope = nock('https://identity.api.rackspacecloud.com')
      .post('/v2.0/tokens', {
        auth: {
          'RAX-KSKEY:apiKeyCredentials': {
            username: 'uncached',
            apiKey: 'f005ba11f005ba11f005ba11f005ba11'
          },
          tenantId: '123456'
        }
      })
      .reply(200, currentServiceCatalog());

    ksks.authenticate({
      username: 'uncached',
      apiKey: 'f005ba11f005ba11f005ba11f005ba11',
      tenantId: '123456'
    }, function (err, catalog) {
      if (err) {
        return done(err);
      }
      scope.done();
      expect(catalog).to.exist();
      done();
    });
  });

  it('returns the cached service catalog', function (done) {
    var cache = cacheManager.caching({ store: 'memory' }),
      client;

    cache.set('ksks.user.foo', currentServiceCatalog());
    client = ksks({ cache: cache });
    client.authenticate({
      username: 'foo',
      password: 'didntmatter'
    }, function (err, catalog) {
      if (err) {
        return done(err);
      }
      expect(catalog).to.exist();
      done();
    });
  });

  it('refreshes an expired service catalog', function (done) {
    var cache = cacheManager.caching({ store: 'memory' }),
      client, scope;

    cache.set('ksks.user.foo', expiredServiceCatalog());
    client = ksks({ cache: cache });
    scope = nock('https://identity.api.rackspacecloud.com')
      .post('/v2.0/tokens')
      .reply(200, currentServiceCatalog());

    client.authenticate({
      username: 'foo',
      password: 'thestruggleisreal'
    }, function (err, catalog) {
      if (err) {
        return done(err);
      }
      scope.done();
      expect(catalog).to.exist();
      done();
    });
  });

  it('propagates authentication failures', function (done) {
    var scope = nock('https://identity.api.rackspacecloud.com')
      .post('/v2.0/tokens')
      .reply(401, { unauthorized: { code: 401, message: 'Oops!' } });

    ksks.authenticate({
      username: 'badaccount',
      apiKey: '1111222233334444'
    }, function (err) {
      scope.done();
      expect(err).to.exist();
      done();
    });
  });
});

describe('ksks.endpoint', function () {
  it('gets a catalog endpoint', function () {
    expect(ksks.endpoint(MOCK.serviceCatalog, { service: 'cloudMonitoring' }))
      .to.equal('https://monitoring.api.rackspacecloud.com/v1.0/987654');
  });

  it('gets an endpoint with a region', function () {
    expect(ksks.endpoint(MOCK.serviceCatalog, {
      service: 'autoscale',
      region: 'SYD'
    })).to.equal('https://syd.autoscale.api.rackspacecloud.com/v1.0/987654');
  });

  it('returns undefined if there is no such service', function () {
    expect(ksks.endpoint(MOCK.serviceCatalog, {
      service: 'unicornLaunching'
    })).to.be.undefined();
  });

  it('returns undefined if there is no such region', function () {
    expect(ksks.endpoint(MOCK.serviceCatalog, {
      service: 'cloudBackup',
      region: 'ASGARD'
    })).to.be.undefined();
  });
});
