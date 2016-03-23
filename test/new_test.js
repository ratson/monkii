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
describe('insert\'s error', function() {
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
				//console.log(arguments, 'success1');
				done('should\'t success');
			}, function() {
				//console.log(arguments, 'fail1');
				done();
			});
	});
});

describe('update\'s return', function() {
	it('should be 0 for zero modification', function(done) {
		users
			.update({
				unique: 4
			}, {
				$set: {
					unique: 4.5
				}
			})
			.then(function(ans) {
				expect(ans).to.be(0);
				//console.log(arguments, 'success1');
				done();
			});
	});
	it('should be 1 for single modification', function(done) {
		users
			.insert({
				unique: 5
			})
			.then(function() {
				//console.log(arguments, 'success1');
				return users.update({
					unique: 5
				}, {
					$set: {
						unique: 5.5
					}
				});
			})
			.then(function(ans) {
				//console.log(arguments, 'success2');
				expect(ans).to.be(1);
				done();
			});
	});
	it('should be n for multiple modification', function(done) {
		users
			.insert([{
				unique: 6,
				common: 'a'
			}, {
				unique: 7,
				common: 'a'
			}, {
				unique: 8,
				common: 'b'
			}])
			.then(function() {
				//console.log(arguments, 'success1');
				return users.update({
					common: 'a'
				}, {
					$set: {
						common: 'c'
					}
				}, {
					multi: true
				});
			})
			.then(function(ans) {
				//console.log(arguments, 'success2');
				expect(ans).to.be(2);
				done();
			});
	});
});
