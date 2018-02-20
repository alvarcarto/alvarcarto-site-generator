# Static site generator for alvarcarto.com

This generator transforms our WordPress site to a static version. 


## Usage

* Run the latest version of WordPress locally or in e.g. AWS. 

    You can also test this generator by pointing it to alvarcarto.com. 
    **Beware that CloudFlare may have some scraping protections in place.**

* Run `node . https://alvarcarto.com`
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

