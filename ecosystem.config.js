module.exports = {
  apps : [{
    name: 'HTTP-API',
    script: 'app.js',
    watch: 'app.jss'
  }, {
    name: 'Worker',
    script: 'worker.js',
    watch: 'worker.js'
  }],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
