import { RoomApp } from "../_components/room/RoomApp";
import { RoomTitleArt } from "../_components/room/RoomTitleArt";

/** `/sala`: a sala em que a pessoa está, reconhecida pelo cookie de membro (RNE002). */
export default function RoomPage() {
    return <RoomApp art={<RoomTitleArt />} />;
}
