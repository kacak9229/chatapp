var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var Schema = mongoose.Schema;

var UserSchema = new Schema({
  socketId: String,
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  username: { type: String, required: true, unique: true, lowercase: true},
  password: { type: String, required: true}

});

UserSchema.methods.hashPassword = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync());
};

UserSchema.methods.comparePassword = function(password) {
	return bcrypt.compareSync(password, this.password);
};


module.exports = mongoose.model('User', UserSchema);
