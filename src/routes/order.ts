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
    id: number, 
    type: Side, 
    price: number,
    qty: number,
    stakeholders: Map<string, Stakeholder>
}


let order_books:{[key: string] : Order[]} = {
    "tata" : 
    [
        {
            id: 1, 
            type: Side.Sell,
            price: 1000,
            qty: 7,
            stakeholders: new Map()
        }, 
        {
            id: 2, 
            type: Side.Sell,
            price: 999,
            qty: 12, 
            stakeholders: new Map()
        }, 
        {
            id: 3, 
            type: Side.Sell,
            price: 998,
            qty: 21, 
            stakeholders: new Map()
        }, 
        {
            id: 4, 
            type: Side.Sell,
            price: 997,
            qty: 100, 
            stakeholders: new Map()
        }, 
        {
            id: 5, 
            type: Side.Buy,
            price: 995,
            qty: 7, 
            stakeholders: new Map()
        }, 
        {
            id: 6, 
            type: Side.Buy,
            price: 994,
            qty: 12,
            stakeholders: new Map()
        }, 
        {
            id: 7 , 
            type: Side.Buy,
            price: 993,
            qty: 21,
            stakeholders: new Map()
        }, 
        {
            id: 8, 
            type: Side.Buy,
            price: 992,
            qty: 100,
            stakeholders: new Map()
        }
    ],  
};


// zod validation

orderRoute.post("/", (req:Request, res:Response) => {
    // if no limit present in property
    
    if (req.body.ticker in order_books)
    {
        if (!req.body.limit) 
        {
            const order_book = order_books.ticker;
            // Case 1: Market Order & Buy
            if(req.body.type == Side.Buy)
            {
                return handleMarketBuyOrders(req, res, order_book);
            }
            else if (req.body.type == Side.Sell){
                return handleMarketSellOrders(req, order_book);
            }
        }
        else{
            const order_book = order_books.ticker;
            if(req.body.type == Side.Buy)
            {
                return handleLimitBuyOrders(req, order_book);
            }
            else if (req.body.type == Side.Sell){
                return handleLimitSellOrders(req, order_book);
            }
        }
    }
    else
    {
        return res.status(403).json({msg: "Couldn't find the requested stock ticker!!!"});
    }
});

function handleMarketBuyOrders(req:Request, res: Response, order_book:Order[])
   {
                const buyer:User = req.userDetail;
                const sellOrders:Order[] = order_book.filter((order) => {order.type == Side.Sell});
                const buyQty = req.body.qty;
                const ticker = req.body.ticker;
                if(sellOrders.length > 0){
                    //sort the bids based on price
                    var remaining_qty = buyQty;
                    
                    while (remaining_qty > 0){
                        sellOrders.sort((o1, o2) => o2.price - o1.price);
                        for(let i = 0; i < sellOrders.length; i++){
                            if (sellOrders[i].qty > buyQty)
                            {
                                if (buyer.balance >= sellOrders[i].price*buyQty) {
                                    sellOrders[i] = clearSellOrder(req, res, buyer, sellOrders[i], buyQty, ticker);
                                    remaining_qty = 0; 
                                    break;
                                }
                                else {
                                    return res.status(403).json({msg: "Insufficient wallet balance"});
                                }   
                            }
                            else{
                                
                            }
                        }
                    }

                }

            } 


function updateUserBalanceAndAssets(user:User, price:number, qty: number, ticker: string, side: Side)
{
    if(side == Side.Buy) {
        user.balance -= price*qty;
        if (ticker in user.assets)
        {
            const ownedAssets:any = user.assets.get(ticker);
            ownedAssets.qty += qty;
            user.assets.set(ticker, ownedAssets);
        }
        else
        {
            user.assets.set(ticker, {qty : qty, avg_price: price});
        }
    }
    else {
        user.balance += price*qty;
        const ownedAssets:any = user.assets.get(ticker);
        ownedAssets.qty -= qty;
        if(ownedAssets.qty > 0){
            user.assets.set(ticker, ownedAssets);
        }
        else 
        {
            user.assets.delete(ticker);
        } 
    }
    users.set(user.customer_id.toString(), user);   
}

function getValidStakeholdersFromSellOrder(order: Order, qty: number) {
    
    let stakeholders:Stakeholder[] = [];
    
    order.stakeholders = sortStakeholdersBasedOnOrderCreatedTime(order);

    let excessQtyStakeholderId = ""; 
    for (const [customer_id, stakeholder] of order.stakeholders) {
        if (qty - stakeholder.qty >= 0) {
            qty -= stakeholder.qty;
            stakeholders.push(stakeholder);
        }
        else{
            // there is a chance that qty == 0 when the control reaches here.
            // in that case, we can simply break the loop.
            if(qty > 0){
                excessQtyStakeholderId = customer_id;
            }
            break;
        }
    }

    if(excessQtyStakeholderId) {
        //update stakeholder's qty. don't delete.
        let excessQtyStakeholder:any = order.stakeholders.get(excessQtyStakeholderId);
        excessQtyStakeholder.qty -= qty;
        stakeholders.push(excessQtyStakeholder);
        qty = 0;
        order.stakeholders.set(excessQtyStakeholderId, excessQtyStakeholder);
    }
    return {order, stakeholders};
}

function sortStakeholdersBasedOnOrderCreatedTime(order:Order){
    const stakeholderMapArray = Array.from(order.stakeholders);
    const sorted = stakeholderMapArray.sort((a, b) => {
        return a[1].createdAt.getTime() - b[1].createdAt.getTime();
    });
    return new Map<string, Stakeholder>(sorted);
}

function clearSellOrder(req:Request, res:Response, buyer:User, sellOrder:Order, buyQty: number, ticker: string) : Order{
    let {order, stakeholders} = getValidStakeholdersFromSellOrder(sellOrder, buyQty);
    sellOrder = order;
    //update buyer balance
    updateUserBalanceAndAssets(buyer, sellOrder.price, sellOrder.qty, ticker, Side.Buy);
    for (let j = 0; j < stakeholders.length; j++){
        let seller = users.get(stakeholders[j].customer_id.toString());
        if(seller){
            //update seller balance one-by-one
            updateUserBalanceAndAssets(seller, order.price, stakeholders[j].qty, ticker, Side.Sell);
        }
    }
    return sellOrder;
}
