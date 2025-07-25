# Configuration

After [installing](INSTALL.md) this software, you may need to carry out some of these configuration steps, depending on your tasks.

## Application configuration

Many settings are available in `config/settings.yml`. You can customize your installation of `openstreetmap-website` by overriding these values using `config/settings.local.yml`

## Populating the database

Your installation comes with no geographic data loaded. You can either create new data using one of the editors (iD, JOSM etc) or by loading an OSM extract.

After installing but before creating any users or data, import an extract with [Osmosis](https://wiki.openstreetmap.org/wiki/Osmosis) and the [``--write-apidb``](https://wiki.openstreetmap.org/wiki/Osmosis/Detailed_Usage#--write-apidb_.28--wd.29) task.

```
osmosis --read-pbf greater-london-latest.osm.pbf \
  --write-apidb host="localhost" database="openstreetmap" \
  user="openstreetmap" password="" validateSchemaVersion="no"
```

Loading an apidb database with Osmosis is about **twenty** times slower than loading the equivalent data with osm2pgsql into a rendering database. [``--log-progress``](https://wiki.openstreetmap.org/wiki/Osmosis/Detailed_Usage#--log-progress_.28--lp.29) may be desirable for status updates.

To be able to edit the data you have loaded, you will need to use this [yet-to-be-written script](https://github.com/openstreetmap/openstreetmap-website/issues/282).

## Managing Users

If you create a user by signing up to your local website, you need to confirm the user before you can log in, which normally happens by clicking a link sent via email. If don't want to set up your development box to send emails to public email addresses then you can create the user as normal and then confirm it manually through the Rails console:

```
$ bundle exec rails console
>> user = User.find_by(:display_name => "My New User Name")
=> #[ ... ]
>> user.activate!
=> true
>> quit
```

### Giving Administrator/Moderator Permissions

To give administrator or moderator permissions:

```
$ bundle exec rails console
>> user = User.find_by(:display_name => "My New User Name")
=> #[ ... ]
>> user.roles.create(:role => "administrator", :granter_id => user.id)
=> #[ ... ]
>> user.roles.create(:role => "moderator", :granter_id => user.id)
=> #[ ... ]
>> quit
```

## OAuth Consumer Keys

There are two built-in applications which communicate via the API, and therefore need to be registered as OAuth 2 applications. These are:

* iD
* The website itself (for the Notes functionality)

You can register them by running the following rake task:

```
bundle exec rails oauth:register_apps["My New User Name"]
```

This task registers the applications with the "My New User Name" user as the owner
and saves their keys to `config/settings.local.yml`. When logged in, the owner should be able to see the apps on the [OAuth 2 applications](http://127.0.0.1:3000/oauth2/applications) page.

Alternatively you can register the applications manually, as described in the next section.

### Manually registering the build-in OAuth applications

For iD, do the following:

* Go to "[OAuth 2 applications](http://localhost:3000/oauth2/applications)" on the My settings page.
* Click on "Register new application".
* Unless you have set up alternatives, use Name: "Local iD" and Redirect URIs: "http://localhost:3000"
* Check boxes for the following Permissions
  * 'Read user preferences'
  * 'Modify user preferences'
  * 'Modify the map'
  * 'Read private GPS traces'
  * 'Upload GPS traces'
  * 'Modify notes'
* On the next page, copy the "Client ID"
* Edit config/settings.local.yml in your rails tree
* Add the "id_application" configuration with the "Client ID" as the value
* Restart your rails server

An example excerpt from settings.local.yml:

```yaml
# Default editor
default_editor: "id"
# OAuth 2 Client ID for iD
id_application: "Snv…OA0"
```

To allow [Notes](https://wiki.openstreetmap.org/wiki/Notes) and changeset discussions to work, follow a similar process, this time registering an OAuth 2 application for the web site:

* Go to "[OAuth 2 applications](http://localhost:3000/oauth2/applications)" on the My settings page.
* Click on "Register new application".
* Use Name: "OpenStreetMap Web Site" and Redirect URIs: "http://localhost:3000"
* Check boxes for the following Permissions
  * 'Modify the map'
  * 'Modify notes'
* On the next page, copy the "Client Secret" and "Client ID"
* Edit config/settings.local.yml in your rails tree
* Add the "oauth_application" configuration with the "Client ID" as the value
* Add the "oauth_key" configuration with the "Client Secret" as the value
* Restart your rails server

An example excerpt from settings.local.yml:

```yaml
# OAuth 2 Client ID for the web site
oauth_application: "SGm8QJ6tmoPXEaUPIZzLUmm1iujltYZVWCp9hvGsqXg"
# OAuth 2 Client Secret for the web site
oauth_key: "eRHPm4GtEnw9ovB1Iw7EcCLGtUb66bXbAAspv3aJxlI"
```

## Troubleshooting

Rails has its own log.  To inspect the log, do this:

```
tail -f log/development.log
```

If you have more problems, please ask on the [rails-dev@openstreetmap.org mailing list](https://lists.openstreetmap.org/listinfo/rails-dev) or on the [#osm-dev IRC Channel](https://wiki.openstreetmap.org/wiki/IRC)

## Maintaining your installation

If your installation stops working for some reason:

* Sometimes gem dependencies change. To update go to your `openstreetmap-website` directory and run ''bundle install'' as root.

* The OSM database schema is changed periodically and you need to keep up with these improvements. Go to your `openstreetmap-website` directory and run:

```
bundle exec rails db:migrate
```

## Testing on the osm dev server

For example, after developing a patch for `openstreetmap-website`, you might want to demonstrate it to others or ask for comments and testing. To do this you can [set up an instance of openstreetmap-website on the dev server in your user directory](https://wiki.openstreetmap.org/wiki/Using_the_dev_server#Rails_Applications).

# Contributing

For information on contributing changes to the codes, see [CONTRIBUTING.md](CONTRIBUTING.md)

# Production Deployment

If you want to deploy `openstreetmap-website` for production use, you'll need to make a few changes.

* It's not recommended to use `rails server` in production. Our recommended approach is to use [Phusion Passenger](https://www.phusionpassenger.com/). Instructions are available for [setting it up with most web servers](https://www.phusionpassenger.com/documentation_and_support#documentation).
* Passenger will, by design, use the Production environment and therefore the production database - make sure it contains the appropriate data and user accounts.
* The included version of the map call is quite slow and eats a lot of memory. You should consider using [CGIMap](https://github.com/zerebubuth/openstreetmap-cgimap) instead.
* Make sure you generate the i18n files and precompile the production assets: `RAILS_ENV=production bundle exec i18n export; bundle exec rails assets:precompile`
* Make sure the web server user as well as the rails user can read, write and create directories in `tmp/`.
