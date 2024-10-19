import express, {Request, Response}  from "express";
import {User, users, OwnedAssets} from "./user";

export const orderRoute:any = express.Router();
orderRoute.use(express.json());

enum Side {
    Buy, 
    Sell
}

interface Stakeholder {
    customer_id : number, 
    qty: number, 
    createdAt: Date
}

interface Order {
    type: Side, 
    price: number,
    qty: number,
    stakeholders: Stakeholder[]
}


let order_books:{[key: string] : Order[]} = {
    "tata" : 
    [
        {
            type: Side.Sell,
            price: 1000,
            qty: 7,
            stakeholders: []
        }, 
        {
            type: Side.Sell,
            price: 999,
            qty: 12, 
            stakeholders: []
        }, 
        {
            type: Side.Sell,
            price: 998,
            qty: 21, 
            stakeholders: []
        }, 
        {
            type: Side.Sell,
            price: 997,
            qty: 100, 
            stakeholders: []
        }, 
            {
            type: Side.Buy,
            price: 995,
            qty: 7, 
            stakeholders: []
        }, 
        {
            type: Side.Buy,
            price: 994,
            qty: 12,
            stakeholders: [] 
        }, 
        {
            type: Side.Buy,
            price: 993,
            qty: 21,
            stakeholders: []
        }, 
        {
            type: Side.Buy,
            price: 992,
            qty: 100,
            stakeholders: []
        }
    ],  
};


// zod validation
// middleware authentication

orderRoute.post("/", (req:Request, res:Response) => {
    const body = req.body;
    // if no limit present in property
    if (!body.limit){
        //market order
        var qty = body.qty;
        var ticker = body.ticker;
        if (ticker in order_books)
        {
            const order_book = order_books.ticker;
            // Case 1: Market Order & Buy
            if(body.type == "buy"){
                const buyer:User = req.userDetail;
                const asks:Order[] = order_book.filter((order) => {order.type == Side.Sell});
                if(asks.length > 0){
                    //sort the bids based on price
                    asks.sort((o1, o2) => o2.price - o1.price);
                    asks.map((ask) => {
                        if(ask.qty > qty){
                            if(buyer.balance >= ask.price*qty)
                            {
                                // First come First serve for stakeholders
                                ask.stakeholders.sort((s1, s2) => {return s1.createdAt.getTime() - s2.createdAt.getTime();});

                                // checking for qty
                                const stakeholder: Stakeholder | undefined  = ask.stakeholders.find((stakeholder) => {return stakeholder.qty >= qty});
                                let seller_id:number;
                                if (stakeholder) {
                                    seller_id = stakeholder.customer_id;
                                    if(stakeholder.qty == qty) {
                                        //remove stakeholder
                                        ask.stakeholders.splice(ask.stakeholders.indexOf(stakeholder));
                                    }
                                    else {
                                        //partial order serving
                                        ask.stakeholders[ask.stakeholders.indexOf(stakeholder)].qty -= qty;
                                    }

                                    //handle buyer and seller data
                                
                                    buyer.balance -= ask.price*qty;
                                    if (ticker in buyer.assets)
                                    {
                                        const ownedAssets: undefined | OwnedAssets = 
                                        buyer.assets.get(ticker);
                                        if(ownedAssets){
                                            ownedAssets.qty += qty;
                                            buyer.assets.set(ticker, ownedAssets);
                                        }
                                    }
                                    else
                                    {
                                        buyer.assets.set(ticker, {qty : qty, avg_price: ask.price});
                                    }

                                    const seller:User | undefined = users.get(seller_id.toString());

                                    if(seller)
                                    {
                                        seller.balance += ask.price*qty;
                                        if (ticker in seller.assets)
                                        {
                                            const ownedAssets: undefined | OwnedAssets = 
                                            buyer.assets.get(ticker);
                                            if(ownedAssets){
                                                ownedAssets.qty -= qty;
                                                if(ownedAssets.qty == 0){
                                                    seller.assets.delete(ticker);
                                                }
                                                else{
                                                    seller.assets.set(ticker, ownedAssets);
                                                }
                                                
                                            }
                                        }
                                        users.set(buyer.customer_id.toString(), buyer);
                                        users.set(seller?.customer_id.toString(), seller);
                                    }
                                    
                                    // handle order book data
                                    order_book[order_book.indexOf(ask)].qty -= qty;
                                    order_books[ticker] = order_book;
                                    return res.status(200).json({
                                        msg: "Txn Successful"
                                    });

                                }
                                else{
                                    return res.status(403).json({msg: "No eligible seller found!"});
                                }                              
                            }
                        }
                        ask
                    });
                }

            }
            // Case 2: Market Order & Sell 
            
        }
        
    }

    return res.status(200).send();


});