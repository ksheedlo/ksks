ksks ![](https://travis-ci.org/ksheedlo/ksks.svg?branch=master)
====

A Keystone client implementation with caching.

## Installation

```
$ npm install ksks
```

## API

### ksks([options])

Creates a Keystone client with the specified `options`. These may include

- `cache` - A cache. It should be API compatible with
  [node-cache-manager](https://github.com/BryanDonovan/node-cache-manager)
  caches, meaning it should support the following functions:

    ```
    set(key, val, ttl, cb)
    get(key, cb)
    del(key, cb)
    ```

  where `key` is a string, `val` can be anything, `ttl` is an integer number of
  seconds and `cb` is a callback for the result.
- `identityEndpoint` - The Keystone identity endpoint to use, as a string.
  Defaults to `https://identity.api.rackspacecloud.com/v2.0/tokens`.

### client#authenticate(props, cb)
### ksks.authenticate(props, cb)

Authenticates and returns an access response to the calback. `props` is a hash
containing the following keys:

- `username` - REQUIRED The username to log in as.
- `apiKey` - The API key to use. If it is not supplied, a password must be used
  instead.
- `password` - The password to use. If it is not supplied, an API key must be
  present.

The callback takes two arguments `(err, res)` where `err` is the error that
occurred, if any, and `res.access` is the access from Keystone containing an
access token and a service catalog.

When called as a client method, this function uses the configuration that the
client was initialized with. When called as the function on `ksks`, it uses a
default configuration and default in-memory cache.

### ksks.endpoint(catalog, props)

Parses the existing catalog for a public endpoint satisfying the specified
criteria. Criteria are specified in the `props` configuration object and may
include:

- `service` - The name of the service, e.g., `'cloudBlockStorage'`. This argument
  is required.
- `region` - The desired region as a 3-letter code, e.g., `'HKG'`. If not
  specified and the requested service has more than one region, the region will
  be chosen arbitrarily.
