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

describe('remove\'s return', function() {
	it('should be 0 for zero modification', function(done) {
		users
			.remove({
				unique: 10
			})
			.then(function(ans) {
				expect(ans).to.be(0);
				done();
			});
	});
	it('should be n otherwise', function(done) {
		users
			.insert({
				unique: 10
			})
			.then(function() {
				return users.remove({
					unique: 10
				});
			})
			.then(function(ans) {
				expect(ans).to.be(1);
				done();
			});
	});
});

describe('remove\'s error', function() {
	it('should fail properly', function(done) {
		users
			.remove({
				$or: 'ninja'
			})
			.then(null, function() {
				done();
			});
	});
});

describe('aggregate\'s error', function() {
	it('should fail properly', function(done) {
		users
			.aggregate()
			.then(null, function() {
				done();
			});
	});
});

describe('aggregate\'s normal flow', function() {
	it('should word in normal case', function(done) {
		users
			.aggregate([{
				$group: {
					_id: null,
					maxUnique: {
						$max: '$unique'
					}
				}
			}])
			.then(function(ans) {
				expect(ans).to.be.an('array');
				expect(ans.length).to.be(1);
				done();
			});
	});

	it('should word with option', function(done) {
		users
			.aggregate([{
				$group: {
					_id: null,
					maxUnique: {
						$max: '$unique'
					}
				}
			}], {
				allowDiskUse: true
			})
			.then(function(ans) {
				expect(ans).to.be.an('array');
				expect(ans.length).to.be(1);
				done();
			});
	});
});
