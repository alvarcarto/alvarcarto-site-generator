# Static site generator for alvarcarto.com

This generator transforms our WordPress site to a static version. 


## Usage

* Run the latest version of WordPress locally or in e.g. AWS. Let's assume you have it running at `http://localhost:3000`.
* Run `node . http://localhost:3000`
  
    You can also test this generator by pointing it to `node . https://alvarcarto.com`. 
    **Beware that CloudFlare may have some scraping protections in place.**

* `cd ../alvarcarto.com`
* Commit changes and push to Github
* Verify that QA site looks OK (auto-deployment enabled)
* Deploy to production and lock the deployment


## Install


* `npm install`

* `cd .. && git clone git@github.com:kimmobrunfeldt/alvarcarto.com.git`

    Clone alvarcarto.com repository aside this repository. You should have e.g. 
    `code/alvarcarto-site-generator` and `code/alvarcarto.com` repo directories.

    The generator will spit the files to `../alvarcarto.com` by default.


## How it works

We're using [node-website-scraper](https://github.com/website-scraper/node-website-scraper) to scrape the WordPress site. 
Not all files are reachable with normal links and scraping, so we have a whitelist of urls to manually download e.g. sitemap.
On top of that, everything from `files` directory is copied to the destination folder. This is useful for e.g. Netlify-specific files.

