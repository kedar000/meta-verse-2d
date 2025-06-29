import jwt from "jsonwebtoken"

const createToken = (userId : String)=>{
    const jwtSecret = process.env.JWT_SECRET;
    console.log("Reached function createToken , " , jwtSecret)
    if( jwtSecret == null ||  jwtSecret == undefined ){
        return console.error("Check the jwt secret " ,  jwtSecret)
    }
    return jwt.sign({id : userId } , jwtSecret  , {
        // expiresIn : process.env.JWT_EXPIRES_IN,
    })
}

export default createToken