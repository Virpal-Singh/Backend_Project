import 'dotenv/config';
import connectDB from "./db/index.js";
import app from './app.js'


connectDB()
.then(()=>{
    app.on('error',(err)=>{
        console.log('Error by app on : ',err);
        throw err;
    })

    app.listen(process.env.PORT || 3000,()=>{
        console.log('server is ready on port:',process.env.PORT || 3000)
    })
})
.catch((err)=>{console.log('Eroor from catch by promise: ',err)})



















// we can also connect databse direct in index file like that
// (async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on('error', (err) => {
//             console.error('Server error:', err);
//             throw err;
//         });
//         app.listen(process.env.PORT, () => {
//             console.log(`Server is running on port ${process.env.PORT}`);
//         });
//     } catch (error) {
//         console.log("DB_connection_Error: ",error);
//         throw error
//     }
// })()
