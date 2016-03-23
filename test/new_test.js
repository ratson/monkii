var expect = require('expect.js');
var db = require('../lib/monk')('localhost/monkii');
var users = db.get('users');
users.drop();
users.index('unique', {
	unique: true
});

/**
	mimic collection.test.js
*/
describe('insert error', function() {
	it('should handle single insert', function(done) {
		users
			.insert({
				unique: 2
			})
			.then(function() {
				//console.log(arguments, 'success1');
				return users.insert({
					unique: 2
				});
			})
			.then(function() {
				//console.log(arguments, 'success2');
				done('should\'t success');
			}, function() {
				//console.log(arguments, 'fail2');
				done();
			});
	});

	it('should handle array case', function(done) {
		users
			.insert([{
				unique: 3
			}, {
				unique: 3
			}])
			.then(function() {
				console.log(arguments, 'success1');
				done('should\'t success');
			}, function() {
				console.log(arguments, 'fail1');
				done();
			});
	});
});
