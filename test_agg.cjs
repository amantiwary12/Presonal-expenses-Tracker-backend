const mongoose = require('mongoose');
const Transaction = require('./models/transaction.model.js').default;

mongoose.connect('mongodb+srv://amantiwary2505:amantiwary9835383246@amantiwary2505.tefim1g.mongodb.net/myDatabase?retryWrites=true&w=majority')
  .then(async () => {
    try {
      const matchStage = {
        company: new mongoose.Types.ObjectId('69f88e3ac92aa8a77cf48884'),
        type: 'expense'
      };
      const summary = await Transaction.aggregate([
        { $match: matchStage },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);
      console.log('Summary with ObjectId:', summary);

      const matchStageString = {
        company: '69f88e3ac92aa8a77cf48884',
        type: 'expense'
      };
      const summaryString = await Transaction.aggregate([
        { $match: matchStageString },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);
      console.log('Summary with String ID:', summaryString);
      
    } catch (e) {
      console.error(e);
    }
    process.exit(0);
  });
