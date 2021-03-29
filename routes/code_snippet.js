if(req.headers.authorization){
    var token = req.headers.authorization.split(' ')
    if(token[0] == 'Bearer'){
        accesstoken = token[1]
    }else{
        res.json({
            'success' : false,
            'error' : 'Please use bearer token to log in'
        })
    }
}

if(accesstoken){
    let auth = new Authetication
    let checktoken = await auth.checkToken(accesstoken)
    if(checktoken <= 0){
        res.json({
            'success' : false,
            'error' : 'Invalid token'
        })
    }else{
    }
}else{
    res.json({
        'success' : false,
        'error' : 'Please log in first'
    })
}