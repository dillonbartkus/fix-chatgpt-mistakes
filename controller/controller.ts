import { findBooking } from '../model/model';

export const authorizeUser = async (req: Request, res: Response) => {
    // add JWT to authorize user, make each endpoint require this token before sending a response
}

export const postBooking = async (req: Request, res: Response) => {
    const booking = await findBooking()

    // ...
}

export const getBookings = async (req: Request, res: Response) => {

}

export const getBookingHistory = async (req: Request, res: Response) => {

}


export const getCredits = async (req: Request, res: Response) => {

}