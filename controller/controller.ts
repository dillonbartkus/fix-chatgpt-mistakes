import { findBooking } from "../model/model";

export const postBooking = async (req, res) => {
    const booking = await findBooking()

    ...

}

// TODO: add all the rest of the controller functions