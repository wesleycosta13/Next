import { Modal, Button } from "react-bootstrap";

export default function ModalSucesso({
    show,
    onHide,
    title = "Operação realizada!",
    message = "Operação realizada com sucesso.",
    buttonText = "Ok",
    buttonVariant = "primary",
    onAction
}) {
    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title className="text-primary fw-bold">{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-muted">{message}</Modal.Body>
            <Modal.Footer>
                <Button variant={buttonVariant} onClick={onAction || onHide}>
                    {buttonText}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
