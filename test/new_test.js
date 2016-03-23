var expect = require('expect.js');
var db = require('../lib/monk')('localhost/monkii');
var users = db.get('users');
users.drop();
users.index('unique', {
	unique: true
});

describe('insert\'s error', function() {
	it('should handle single insert', function(done) {
		users
			.insert({
				unique: 2
			})
			.then(function() {
				return users.insert({
					unique: 2
				});
			})
			.then(null, function() {
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
			.then(null, function() {
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
				done();
			});
	});
	it('should be 1 for single modification', function(done) {
		users
			.insert({
				unique: 5
			})
			.then(function() {
				return users.update({
					unique: 5
				}, {
					$set: {
						unique: 5.5
					}
				});
			})
			.then(function(ans) {
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
				expect(ans).to.be(2);
				done();
			});
	});
});

describe('update\'s error', function() {
	it('should fail properly', function(done) {
		users
			.update({
				unique: 9
			}, {
				$set: 'ninja'
			})
			.then(null, function() {
				done();
			});
	});
});
